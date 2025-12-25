import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  isActive: boolean;
  volume: number; // 0 to 255 roughly
  isTalking: boolean;
}

export const Visualizer: React.FC<VisualizerProps> = ({ isActive, volume, isTalking }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const draw = () => {
      time += 0.1;
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      if (!isActive) {
        // Idle state: small breathing circle
        const idleRadius = 20 + Math.sin(time) * 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, idleRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#334155'; // Slate 700
        ctx.fill();
        animationId = requestAnimationFrame(draw);
        return;
      }

      // Active state
      // Normalize volume mostly for visual scale
      const normVol = Math.min(volume / 50, 1.5); 
      
      const baseRadius = 40;
      const dynamicRadius = baseRadius + (normVol * 40);

      // Outer Glow
      const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius, centerX, centerY, dynamicRadius + 40);
      
      if (isTalking) {
         // AI Speaking colors (Blue/Purple/Pink)
         gradient.addColorStop(0, 'rgba(139, 92, 246, 0.8)'); // Violet 500
         gradient.addColorStop(1, 'rgba(59, 130, 246, 0)'); // Blue 500 transparent
      } else {
         // User Speaking/Listening colors (Teal/Cyan)
         gradient.addColorStop(0, 'rgba(20, 184, 166, 0.8)'); // Teal 500
         gradient.addColorStop(1, 'rgba(6, 182, 212, 0)'); // Cyan 500 transparent
      }

      ctx.beginPath();
      ctx.arc(centerX, centerY, dynamicRadius + 20, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Core Circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, dynamicRadius, 0, Math.PI * 2);
      ctx.fillStyle = isTalking ? '#8b5cf6' : '#14b8a6';
      ctx.fill();

      // Ripples
      if (normVol > 0.1) {
          ctx.beginPath();
          ctx.arc(centerX, centerY, dynamicRadius + (Math.sin(time * 5) * 5), 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 2;
          ctx.stroke();
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [isActive, volume, isTalking]);

  return (
    <canvas 
      ref={canvasRef} 
      width={300} 
      height={300} 
      className="w-full h-full"
    />
  );
};