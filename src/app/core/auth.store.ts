import { computed, inject, Injectable, signal } from '@angular/core';
import { Session, User } from '@supabase/supabase-js';
import { SupabaseService } from '../services/supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly supabase = inject(SupabaseService);

  private readonly _user = signal<User | null>(null);
  private readonly _session = signal<Session | null>(null);
  private readonly _initialized = signal(false);

  readonly user = this._user.asReadonly();
  readonly session = this._session.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly initialized = this._initialized.asReadonly();

  constructor() {
    this.supabase.authChanges().subscribe(({ session }) => {
      this._session.set(session);
      this._user.set(session?.user ?? null);
      this._initialized.set(true);
    });
  }

  clear(): void {
    this._user.set(null);
    this._session.set(null);
  }
}
