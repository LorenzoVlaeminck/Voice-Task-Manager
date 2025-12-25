import React from 'react';
import { Task, Priority } from '../types';

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const PriorityBadge: React.FC<{ priority: Priority }> = ({ priority }) => {
  const colors = {
    Low: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    Medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    High: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${colors[priority]} font-medium`}>
      {priority}
    </span>
  );
};

const getStatusStyles = (dateStr?: string, isCompleted?: boolean) => {
  if (isCompleted) {
    return 'bg-slate-900/50 opacity-60 border-slate-800';
  }

  if (!dateStr) {
    return 'bg-slate-800 hover:bg-slate-800/80 hover:border-slate-700 shadow-lg border-slate-800';
  }

  // Expect YYYY-MM-DD format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  
  // If not strict format, return default
  if (!dateRegex.test(dateStr)) {
    return 'bg-slate-800 hover:bg-slate-800/80 hover:border-slate-700 shadow-lg border-slate-800';
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const [y, m, d] = dateStr.split('-').map(Number);
  const taskDate = new Date(y, m - 1, d);

  // Compare timestamps
  if (taskDate.getTime() < now.getTime()) {
    // Overdue: Red Tint
    return 'bg-rose-950/20 border-rose-900/50 hover:bg-rose-900/30 hover:border-rose-700 shadow-lg';
  }
  
  if (taskDate.getTime() === now.getTime()) {
    // Today: Amber/Orange Tint
    return 'bg-amber-950/20 border-amber-900/50 hover:bg-amber-900/30 hover:border-amber-700 shadow-lg';
  }

  // Future
  return 'bg-slate-800 hover:bg-slate-800/80 hover:border-slate-700 shadow-lg border-slate-800';
};

const getStatusText = (dateStr?: string) => {
  if (!dateStr) return null;

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return dateStr; // Return raw string if not ISO

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const [y, m, d] = dateStr.split('-').map(Number);
  const taskDate = new Date(y, m - 1, d);

  if (taskDate.getTime() < now.getTime()) return 'Overdue';
  if (taskDate.getTime() === now.getTime()) return 'Today';
  
  // Return formatted date for future
  return taskDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onToggle, onDelete }) => {
  const containerClasses = getStatusStyles(task.date, task.status === 'completed');
  const dateStatusText = getStatusText(task.date);
  const isOverdue = dateStatusText === 'Overdue' && task.status !== 'completed';
  const isToday = dateStatusText === 'Today' && task.status !== 'completed';

  return (
    <div 
      className={`group relative p-4 rounded-xl transition-all duration-300 border ${containerClasses}`}
    >
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(task.id)}
          className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
            ${task.status === 'completed' ? 'bg-indigo-500 border-indigo-500' : 'border-slate-500 hover:border-indigo-400'}`}
        >
          {task.status === 'completed' && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h3 className={`font-medium text-lg leading-tight ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-100'}`}>
              {task.title}
            </h3>
            <button 
                onClick={() => onDelete(task.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {(task.date || task.time) && (
              <div className={`flex items-center text-xs gap-1 font-medium
                ${isOverdue ? 'text-rose-400' : isToday ? 'text-amber-400' : 'text-slate-400'}
              `}>
                 <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                 </svg>
                 <span>
                    {dateStatusText} {task.time && `• ${task.time}`}
                 </span>
              </div>
            )}
            <PriorityBadge priority={task.priority} />
          </div>
        </div>
      </div>
    </div>
  );
};