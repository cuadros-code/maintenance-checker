import { inject, Injectable } from '@angular/core';
import { from, map, Observable, tap, catchError, throwError } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { ToastService } from '../core/toast.service';

export type IncidentSeverity = 'low' | 'medium' | 'high';

export interface ReportIncidentPayload {
  title: string;
  description: string;
  severity: IncidentSeverity;
  reportedBy?: string;
  notifyEmails?: string[];
}

@Injectable({ providedIn: 'root' })
export class IncidentService {
  private readonly supabase = inject(SupabaseService);
  private readonly toast = inject(ToastService);

  report(payload: ReportIncidentPayload): Observable<void> {
    return from(
      this.supabase.supabase.functions.invoke('incident-report', { body: payload }),
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
      }),
      tap(() => this.toast.success('Incidente reportado correctamente')),
      catchError(err => {
        const msg = err && typeof err === 'object' && 'message' in err
          ? String(err.message)
          : 'Ocurrió un error inesperado';
        this.toast.error(`Error al reportar el incidente: ${msg}`);
        return throwError(() => err);
      }),
    );
  }
}
