import React, { useState, useCallback, useEffect } from 'react';
import { useLiveManager } from './hooks/useLiveManager';
import { Visualizer } from './components/Visualizer';
import { TaskCard } from './components/TaskCard';
import { Task, TaskToolArgs, Priority } from './types';

// Helper to generate ISO dates for demo
const getRelativeDate = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
};

// Initial sample data with dynamic dates
const INITIAL_TASKS: Task[] = [
  { 
    id: '1', 
    title: 'Pay electric bill (Overdue)', 
    priority: 'High', 
    status: 'pending', 
    date: getRelativeDate(-2), // 2 days ago
    createdAt: Date.now() - 200000 
  },
  { 
    id: '2', 
    title: 'Evening gym session (Today)', 
    date: getRelativeDate(0), // Today
    time: '6:00 PM', 
    priority: 'Medium', 
    status: 'pending', 
    createdAt: Date.now() - 1000 
  },
  { 
    id: '3', 
    title: 'Grocery shopping', 
    date: getRelativeDate(1), // Tomorrow
    priority: 'Low', 
    status: 'pending', 
    createdAt: Date.now() 
  },
];

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  
  // Handler for when the AI tool creates a task
  const handleCreateTask = useCallback((args: TaskToolArgs) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: args.title,
      date: args.date,
      time: args.time,
      priority: (args.priority as Priority) || 'Medium',
      status: 'pending',
      createdAt: Date.now(),
    };
    setTasks(prev => [newTask, ...prev]);
  }, []);

  const { isConnected, isTalking, connect, disconnect, volume } = useLiveManager({
    onTaskCreated: handleCreateTask
  });

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const toggleConnection = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

  // Group tasks
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      
      {/* Header */}
      <header className="flex-none p-6 pb-2 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md z-10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Voice Tasks
            </h1>
          </div>
          <div className="text-xs font-mono text-slate-500">
             {isConnected ? (
                <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    LIVE
                </span>
             ) : (
                <span className="text-slate-600">OFFLINE</span>
             )}
          </div>
        </div>
      </header>

      {/* Main Content (Scrollable List) */}
      <main className="flex-1 overflow-y-auto scrollbar-hide p-4">
        <div className="max-w-md mx-auto space-y-6 pb-32">
          
          {/* Pending Tasks */}
          <div className="space-y-3">
             <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider pl-1">Up Next</h2>
             {pendingTasks.length === 0 ? (
                 <div className="text-center py-10 border-2 border-dashed border-slate-800 rounded-xl">
                    <p className="text-slate-600">No pending tasks</p>
                    <p className="text-slate-700 text-sm mt-1">Tap the mic and say "Add a task"</p>
                 </div>
             ) : (
                 pendingTasks.map(task => (
                    <TaskCard key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
                 ))
             )}
          </div>

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-900">
               <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider pl-1">Completed</h2>
               <div className="opacity-75">
                {completedTasks.map(task => (
                    <TaskCard key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
                ))}
               </div>
            </div>
          )}

        </div>
      </main>

      {/* Bottom Control Bar */}
      <div className="flex-none bg-slate-950 border-t border-slate-900 p-4 pb-8">
        <div className="max-w-md mx-auto relative flex flex-col items-center">
            
            {/* Visualizer Container */}
            <div className="absolute bottom-4 left-0 right-0 h-48 pointer-events-none flex items-center justify-center -z-10 opacity-60">
                <Visualizer isActive={isConnected} volume={volume} isTalking={isTalking} />
            </div>

            {/* Mic Button */}
            <button
                onClick={toggleConnection}
                className={`
                    relative group flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300
                    ${isConnected 
                        ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-900/50 shadow-lg hover:scale-105'
                    }
                `}
            >
                {/* Ring Animation when active */}
                {isConnected && (
                    <div className="absolute inset-0 rounded-full border-2 border-rose-500/50 animate-pulse-ring"></div>
                )}
                
                {isConnected ? (
                     <svg className="w-8 h-8 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                     </svg>
                ) : (
                    <svg className="w-8 h-8 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                )}
            </button>
            
            <p className="mt-4 text-sm font-medium text-slate-500">
                {isConnected 
                  ? (isTalking ? "AI is speaking..." : "Listening...") 
                  : "Tap to start"
                }
            </p>

        </div>
      </div>
    </div>
  );
}