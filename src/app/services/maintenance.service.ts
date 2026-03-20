import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type MaintenanceType = 'preventive' | 'corrective' | 'predictive';
export type MaintenanceStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Maintenance {
  id: number;
  machine_id: number;
  type: MaintenanceType;
  description: string | null;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  status: MaintenanceStatus;
  technician_name: string | null;
  notes: string | null;
  created_at: string;
}

export type MaintenancePayload = Pick<
  Maintenance,
  'machine_id' | 'type' | 'description' | 'scheduled_at' | 'technician_name' | 'notes'
>;

export type MaintenanceUpdatePayload = MaintenancePayload & Pick<Maintenance, 'status'>;

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  private readonly supabaseService = inject(SupabaseService);

  private readonly _maintenances = signal<Maintenance[]>([]);
  private readonly _loading = signal(false);
  private _loaded = false;

  readonly maintenances = this._maintenances.asReadonly();
  readonly loading = this._loading.asReadonly();

  async load(): Promise<void> {
    if (this._loaded) return;
    await this.reload();
  }

  async reload(): Promise<void> {
    this._loading.set(true);
    try {
      const { data } = await this.supabaseService.supabase
        .from('maintenances')
        .select('*')
        .order('scheduled_at', { ascending: true });

      this._maintenances.set((data as Maintenance[]) ?? []);
      this._loaded = true;
    } finally {
      this._loading.set(false);
    }
  }

  async create(payload: MaintenancePayload): Promise<{ error: unknown }> {
    const { error } = await this.supabaseService.supabase
      .from('maintenances')
      .insert([payload]);

    if (!error) await this.reload();
    return { error };
  }

  async update(id: number, payload: MaintenanceUpdatePayload): Promise<{ error: unknown }> {
    const { error } = await this.supabaseService.supabase
      .from('maintenances')
      .update(payload)
      .eq('id', id);

    if (!error) await this.reload();
    return { error };
  }

  async delete(id: number): Promise<{ error: unknown }> {
    const { error: tasksError } = await this.supabaseService.supabase
      .from('maintenance_tasks')
      .delete()
      .eq('maintenance_id', id);

    if (tasksError) return { error: tasksError };

    const { error } = await this.supabaseService.supabase
      .from('maintenances')
      .delete()
      .eq('id', id);

    if (!error) this._maintenances.update(list => list.filter(m => m.id !== id));
    return { error };
  }
}
