import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { MaintenanceService } from './maintenance.service';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface MaintenanceTask {
  id: number;
  maintenance_id: number;
  title: string;
  description: string | null;
  order_index: number;
  status: TaskStatus;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  created_at: string;
}

export type MaintenanceTaskPayload = Pick<
  MaintenanceTask,
  'maintenance_id' | 'title' | 'description' | 'order_index' | 'status' | 'notes'
>;

export type MaintenanceTaskUpdatePayload = Partial<
  Pick<MaintenanceTask, 'title' | 'description' | 'status' | 'notes'>
>;

@Injectable({ providedIn: 'root' })
export class MaintenanceTasksService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly maintenanceService = inject(MaintenanceService);

  private readonly _tasks = signal<MaintenanceTask[]>([]);
  private readonly _loading = signal(false);

  readonly tasks = this._tasks.asReadonly();
  readonly loading = this._loading.asReadonly();

  async loadForMaintenance(maintenanceId: number): Promise<void> {
    this._loading.set(true);
    this._tasks.set([]);
    try {
      const { data } = await this.supabaseService.supabase
        .from('maintenance_tasks')
        .select('*')
        .eq('maintenance_id', maintenanceId)
        .order('order_index', { ascending: true });

      this._tasks.set((data as MaintenanceTask[]) ?? []);
    } finally {
      this._loading.set(false);
    }
  }

  async create(payload: MaintenanceTaskPayload): Promise<{ error: unknown }> {
    const { data, error } = await this.supabaseService.supabase
      .from('maintenance_tasks')
      .insert([payload])
      .select()
      .single();

    if (!error && data) {
      this._tasks.update(list => [...list, data as MaintenanceTask]);
      this.maintenanceService.adjustTaskCount(payload.maintenance_id, 1);
    }
    return { error };
  }

  async update(
    id: number,
    payload: MaintenanceTaskUpdatePayload,
    maintenanceId: number,
  ): Promise<{ error: unknown }> {
    const { data, error } = await this.supabaseService.supabase
      .from('maintenance_tasks')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      this._tasks.update(list => list.map(t => (t.id === id ? (data as MaintenanceTask) : t)));
    }
    return { error };
  }
}
