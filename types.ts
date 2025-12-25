export interface Task {
  id: string;
  title: string;
  date?: string;
  time?: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'pending' | 'completed';
  createdAt: number;
}

export interface TaskToolArgs {
  title: string;
  date?: string;
  time?: string;
  priority?: string;
}

export type Priority = 'Low' | 'Medium' | 'High';