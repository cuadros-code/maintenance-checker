import { inject, Injectable } from '@angular/core';
import { from, map, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';

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

  report(payload: ReportIncidentPayload): Observable<void> {
    return from(
      this.supabase.supabase.functions.invoke('incident-report', { body: payload }),
    ).pipe(
      map(({ error }) => {
        if (error) throw error;
      }),
    );
  }
}
