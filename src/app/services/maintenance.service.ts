import { computed, inject, Injectable, signal } from '@angular/core';
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
  assigned_user_id: string | null;
  created_at: string;
  task_count: number;
}

export type MaintenancePayload = Pick<
  Maintenance,
  'machine_id' | 'type' | 'description' | 'scheduled_at' | 'notes' | 'assigned_user_id'
>;

export type MaintenanceUpdatePayload = MaintenancePayload & Pick<Maintenance, 'status'>;

const MAINTENANCE_SELECT = '*, maintenance_tasks(count)' as const;

@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  private readonly supabaseService = inject(SupabaseService);

  private readonly _maintenances = signal<Maintenance[]>([]);
  private readonly _loading = signal(false);
  private _loaded = false;

  readonly maintenances = this._maintenances.asReadonly();
  readonly loading = this._loading.asReadonly();

  /** Mantenimientos pendientes/en-progreso con fecha ≤ hoy+7d (para badge del sidebar) */
  readonly upcomingCount = computed(() => {
    const in7days = new Date();
    in7days.setDate(in7days.getDate() + 7);
    in7days.setHours(23, 59, 59, 999);
    return this._maintenances().filter(m => {
      if (m.status !== 'pending' && m.status !== 'in_progress') return false;
      return new Date(m.scheduled_at) <= in7days;
    }).length;
  });

  async load(): Promise<void> {
    if (this._loaded) return;
    await this.reload();
  }

  async reload(): Promise<void> {
    this._loading.set(true);
    try {
      const { data } = await this.supabaseService.supabase
        .from('maintenances')
        .select(MAINTENANCE_SELECT)
        .order('scheduled_at', { ascending: true });

      this._maintenances.set(this.mapRows((data as unknown[]) ?? []));
      this._loaded = true;
    } finally {
      this._loading.set(false);
    }
  }

  async create(payload: MaintenancePayload): Promise<{ error: unknown }> {
    const { data, error } = await this.supabaseService.supabase
      .from('maintenances')
      .insert([payload])
      .select(MAINTENANCE_SELECT)
      .single();

    if (!error && data) {
      const record = this.mapRow(data as Record<string, unknown>);
      this._maintenances.update(list =>
        [...list, record].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
      );
    }
    return { error };
  }

  async update(id: number, payload: MaintenanceUpdatePayload): Promise<{ error: unknown }> {
    const { data, error } = await this.supabaseService.supabase
      .from('maintenances')
      .update(payload)
      .eq('id', id)
      .select(MAINTENANCE_SELECT)
      .single();

    if (!error && data) {
      const record = this.mapRow(data as Record<string, unknown>);
      this._maintenances.update(list =>
        list
          .map(m => (m.id === id ? record : m))
          .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
      );
    }
    return { error };
  }

  adjustTaskCount(maintenanceId: number, delta: 1 | -1): void {
    this._maintenances.update(list =>
      list.map(m =>
        m.id === maintenanceId ? { ...m, task_count: m.task_count + delta } : m
      )
    );
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

  private mapRow(raw: Record<string, unknown>): Maintenance {
    const counts = raw['maintenance_tasks'] as { count: number }[] | null;
    return { ...raw, task_count: counts?.[0]?.count ?? 0 } as Maintenance;
  }

  private mapRows(rows: unknown[]): Maintenance[] {
    return rows.map(r => this.mapRow(r as Record<string, unknown>));
  }
}
