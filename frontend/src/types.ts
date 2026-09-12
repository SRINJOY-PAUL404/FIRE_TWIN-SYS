export interface Location {
  id: number;
  building_id: number;
  name: string;
  location_type: string;
  capacity: number | null;
  block?: string;
  floor?: string;
}

export interface Extinguisher {
  id: number;
  extinguisher_id: string;
  serial_number: string;
  location_id: number;
  building_id?: number;
  block?: string;
  room?: string;
  type: string;
  capacity: string;
  pressure: number;
  rfid_tag?: string;
  esp32_device_id: string;
  installation_date: string;
  expiry_date: string;
  last_inspection_date?: string;
  next_inspection_date?: string;
  status: string;
  lifecycle_state: string;
  battery: number;
  latitude?: number;
  longitude?: number;
}

export interface Prediction {
  extinguisher_id: number;
  failure_probability: number;
  maintenance_priority: string;
  remaining_useful_life_days: number;
  confidence_score: number;
}

export interface MaintenanceLog {
  id: number;
  extinguisher_id: number;
  technician_id: number | null;
  task_description: string;
  status: string;
  notes?: string;
  scheduled_date?: string;
  completed_date?: string;
  fault_description?: string;
  root_cause?: string;
  confidence?: number;
  fix_notes?: string;
  fix_plan?: {
    problem_summary: string;
    solution_steps: string[];
    materials: { name: string; quantity: number; unit_cost: number }[];
    estimated_cost: number;
    estimated_time_minutes: number;
    root_cause?: string;
    fault_description?: string;
    extinguisher_type?: string;
    extinguisher_capacity?: string;
  };
  started_at?: string;
  completed_at?: string;
  time_to_fix?: number;
  technician_name?: string;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | string;
  status: 'active' | 'disabled' | string;
  created_at?: string;
  last_login_at?: string;
}

