import { computed, inject, Injectable, signal } from '@angular/core';
import { Session, User } from '@supabase/supabase-js';
import { SupabaseService } from '../services/supabase.service';
import { jwtDecode } from 'jwt-decode';
import { AUTH_ROLES } from '../constants/auth.const';

type Role = 'admin' | 'technician' | 'supervisor' ;

interface JwtPayload {
  user_role?: Role
  sub: string;
  email?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly supabase = inject(SupabaseService);

  private readonly _user = signal<User | null>(null);
  private readonly _session = signal<Session | null>(null);
  private readonly _initialized = signal(false);
  private readonly _userRole = signal<Role | null>(null)

  readonly user = this._user.asReadonly();
  readonly session = this._session.asReadonly();
  readonly userRole = this._userRole.asReadonly();

  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly initialized = this._initialized.asReadonly();
  readonly isAdmin = computed(() => this._userRole() === AUTH_ROLES.ADMIN)

  constructor() {
    this.supabase.authChanges().subscribe(({ session }) => {
      this._session.set(session);
      const decoded = session && jwtDecode<JwtPayload>(session ? session?.access_token : '');
      this._userRole.set(decoded?.user_role ?? null);
      this._user.set(session?.user ?? null);
      this._initialized.set(true);
    });
  }

  clear(): void {
    this._user.set(null);
    this._session.set(null);
  }
}
