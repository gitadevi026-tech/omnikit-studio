export type ModuleId =
  | 'organizer'
  | 'compressor'
  | 'vault'
  | 'system'
  | 'pdf'
  | 'text'
  | 'qr'
  | 'converter'
  | 'notes'
  | 'network';

export interface TaskItem {
  id: number;
  text: string;
  done: boolean;
  priority: 'High' | 'Medium' | 'Low';
  created: string;
}

export interface VaultCredential {
  id: string;
  site: string;
  username: string;
  password: string;
  notes?: string;
  created: string;
}

export interface OrganizedFile {
  id: string;
  name: string;
  size: number;
  ext: string;
  category: string;
  renamedName?: string;
}

export interface SystemMetrics {
  cpu: number | null;
  ram: number | null;
  ram_used: string | null;
  ram_total: string | null;
  disk: number | null;
  battery: number | null;
  charging: boolean;
  host: string;
  os: string;
  python: string;
  sampled_at: string;
}
