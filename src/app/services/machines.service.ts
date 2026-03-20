import { inject, Injectable, signal } from '@angular/core';
import { MachineStatus } from '../constants/machines.const';
import { SupabaseService } from './supabase.service';

export interface Machine {
  id: number;
  code: string;
  name: string;
  location: string;
  serial_number: string;
  status: MachineStatus;
  created_at: string;
}

export type MachinePayload = Omit<Machine, 'id' | 'created_at'>;

@Injectable({ providedIn: 'root' })
export class MachinesService {
  private readonly supabaseService = inject(SupabaseService);

  private readonly _machines = signal<Machine[]>([]);
  private readonly _loading = signal(false);
  private _loaded = false;

  readonly machines = this._machines.asReadonly();
  readonly loading = this._loading.asReadonly();

  async load(): Promise<void> {
    if (this._loaded) return;
    await this.reload();
  }

  async reload(): Promise<void> {
    this._loading.set(true);
    try {
      const { data } = await this.supabaseService.supabase
        .from('machines')
        .select('id, code, name, location, serial_number, status, created_at')
        .order('status', { ascending: true });

      this._machines.set((data as Machine[]) ?? []);
      this._loaded = true;
    } finally {
      this._loading.set(false);
    }
  }

  async create(payload: MachinePayload): Promise<{ error: unknown }> {
    const { data, error } = await this.supabaseService.supabase
      .from('machines')
      .insert([payload])
      .select('id, code, name, location, serial_number, status, created_at')
      .single();

    if (!error && data) {
      this._machines.update(list =>
        [...list, data as Machine].sort((a, b) => a.status.localeCompare(b.status))
      );
    }
    return { error };
  }

  async update(id: number, payload: MachinePayload): Promise<{ error: unknown }> {
    const { data, error } = await this.supabaseService.supabase
      .from('machines')
      .update(payload)
      .eq('id', id)
      .select('id, code, name, location, serial_number, status, created_at')
      .single();

    if (!error && data) {
      this._machines.update(list =>
        list
          .map(m => (m.id === id ? (data as Machine) : m))
          .sort((a, b) => a.status.localeCompare(b.status))
      );
    }
    return { error };
  }
}
