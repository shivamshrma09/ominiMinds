export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  notes?: string;
  health_score: number;
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: string;
  user_id: string;
  client_id: string;
  title: string;
  status: 'pending' | 'active' | 'completed';
  transcript?: string;
  summary?: string;
  action_items: ActionItem[];
  started_at?: string;
  ended_at?: string;
  created_at: string;
}

export interface ActionItem {
  task: string;
  owner?: string;
  deadline?: string;
  priority: 'low' | 'medium' | 'high';
}
