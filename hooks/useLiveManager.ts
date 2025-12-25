import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration, LiveSession } from "@google/genai";
import { base64ToUint8Array, decodeAudioData, createPcmBlob } from '../utils/audio';
import { TaskToolArgs } from '../types';

// Tool Definition
const createTaskTool: FunctionDeclaration = {
  name: 'createTask',
  description: 'Create a new task in the task manager. Extract the title, date, time, and priority from the user request.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: 'The main description or name of the task.',
      },
      date: {
        type: Type.STRING,
        description: 'The due date of the task in YYYY-MM-DD format (e.g., "2024-10-27"). Calculate this based on the current date provided in the system instructions.',
      },
      time: {
        type: Type.STRING,
        description: 'The time of the task (e.g., "14:00" or "2pm").',
      },
      priority: {
        type: Type.STRING,
        description: 'The priority level.',
        enum: ['Low', 'Medium', 'High'],
      },
    },
    required: ['title'],
  },
};

interface UseLiveManagerProps {
  onTaskCreated: (task: TaskToolArgs) => void;
}

export const useLiveManager = ({ onTaskCreated }: UseLiveManagerProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isTalking, setIsTalking] = useState(false); // Model is talking
  const [volume, setVolume] = useState(0); // Input volume for visualizer

  // Refs for audio handling to avoid re-renders
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const disconnect = useCallback(() => {
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => session.close());
    }
    
    // Stop microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Disconnect audio nodes
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Clear state
    sessionPromiseRef.current = null;
    setIsConnected(false);
    setIsTalking(false);
    setVolume(0);
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  const connect = useCallback(async () => {
    if (isConnected) return;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Audio Setup
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      // Microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Input processing
      const source = inputContextRef.current.createMediaStreamSource(stream);
      const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      // Analyser for visualization
      const analyser = inputContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      // Volume monitoring loop
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!isConnected && !streamRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        setVolume(sum / dataArray.length);
        requestAnimationFrame(updateVolume);
      };
      // Start monitoring volume slightly delayed to let state settle
      setTimeout(updateVolume, 100);

      const now = new Date();
      const dateString = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `You are a highly efficient and friendly personal task assistant. 
          The current date is ${dateString} and the time is ${timeString}.
          
          When the user asks to add a task, parse the details and call the 'createTask' tool.
          IMPORTANT: Always convert relative dates (like "tomorrow", "next Friday", "today") into strict YYYY-MM-DD format.
          
          If details like priority are missing, default to Medium. 
          If the date is missing, do not assume one unless implied.
          Keep your spoken responses short, confirming the action.`,
          tools: [{ functionDeclarations: [createTaskTool] }],
        },
        callbacks: {
          onopen: () => {
            console.log('Live session connected');
            setIsConnected(true);
          },
          onmessage: async (message: LiveServerMessage) => {
            // 1. Handle Tool Calls
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'createTask') {
                  const args = fc.args as unknown as TaskToolArgs;
                  console.log('Tool call received:', args);
                  
                  // Trigger UI update
                  onTaskCreated(args);
                  
                  // Send response back to model
                  sessionPromise.then(session => {
                    session.sendToolResponse({
                      functionResponses: {
                        id: fc.id,
                        name: fc.name,
                        response: { result: "Task created successfully" }
                      }
                    });
                  });
                }
              }
            }

            // 2. Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
              setIsTalking(true);
              const ctx = audioContextRef.current;
              
              // Sync playback time
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(
                base64ToUint8Array(base64Audio),
                ctx
              );
              
              const sourceNode = ctx.createBufferSource();
              sourceNode.buffer = audioBuffer;
              sourceNode.connect(ctx.destination);
              
              sourceNode.addEventListener('ended', () => {
                sourcesRef.current.delete(sourceNode);
                if (sourcesRef.current.size === 0) {
                  setIsTalking(false);
                }
              });
              
              sourceNode.start(nextStartTimeRef.current);
              sourcesRef.current.add(sourceNode);
              nextStartTimeRef.current += audioBuffer.duration;
            }
          },
          onclose: () => {
            console.log('Session closed');
            disconnect();
          },
          onerror: (err) => {
            console.error('Session error:', err);
            disconnect();
          }
        }
      });

      sessionPromiseRef.current = sessionPromise;

      // Audio Process Handler - Input
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob = createPcmBlob(inputData);
        
        // Only send if session is ready
        sessionPromise.then(session => {
          session.sendRealtimeInput({ media: pcmBlob });
        });
      };

      source.connect(processor);
      processor.connect(inputContextRef.current.destination);

    } catch (error) {
      console.error("Failed to connect:", error);
      disconnect();
    }
  }, [isConnected, onTaskCreated, disconnect]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isTalking,
    connect,
    disconnect,
    volume
  };
};