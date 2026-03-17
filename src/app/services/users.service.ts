import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthStore } from '../core/auth.store';
import { environment } from '../../environments/environment';
import { supabase } from '../core/supabase';

export type AppRole = 'admin' | 'technician' | 'supervisor';

export interface UserWithRole {
  id: string;
  email: string;
  role: AppRole | null;
  created_at: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  role: AppRole;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly authStore = inject(AuthStore);
  private readonly _users = signal<UserWithRole[]>([]);
  private readonly _loading = signal(false);
  private _loaded = false;

  readonly users = this._users.asReadonly();
  readonly loading = this._loading.asReadonly();

  async load(): Promise<void> {
    if (this._loaded) return;
    await this.reload();
  }

  async reload(): Promise<void> {
    this._loading.set(true);
    try {
      const { data, error } = await this.supabaseService.supabase
        .functions
        .invoke('list-users-v1');
    
      this._users.set(data)
      this._loaded = true;
    } finally {
      this._loading.set(false);
    }
  }

  async create(payload: CreateUserPayload): Promise<{ error: unknown }> {
    const { data, error } = await this.supabaseService.supabase
      .functions
      .invoke('create-user-v3', {
        body: { 
          email: payload.email, 
          password: payload.password, 
          role: payload.role 
        },
        headers: {
          Authorization: `Bearer ${environment.supabaseKey}`,
          'x-user-token': this.authStore.session()?.access_token ?? ''
        }
      });

    if (!error) await this.reload();
    return { error };
  }
}
