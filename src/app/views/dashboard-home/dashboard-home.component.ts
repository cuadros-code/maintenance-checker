import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MaintenanceService } from '../../services/maintenance.service';
import { MachinesService } from '../../services/machines.service';

@Component({
  selector: 'app-dashboard-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.css',
})
export class DashboardHomeComponent implements OnInit {
  private readonly maintenanceService = inject(MaintenanceService);
  private readonly machinesService = inject(MachinesService);

  readonly loading = computed(() => this.maintenanceService.loading());

  readonly total      = computed(() => this.maintenanceService.maintenances().length);
  readonly pending    = computed(() => this.maintenanceService.maintenances().filter(m => m.status === 'pending').length);
  readonly inProgress = computed(() => this.maintenanceService.maintenances().filter(m => m.status === 'in_progress').length);
  readonly completed  = computed(() => this.maintenanceService.maintenances().filter(m => m.status === 'completed').length);
  readonly cancelled  = computed(() => this.maintenanceService.maintenances().filter(m => m.status === 'cancelled').length);

  readonly completionRate = computed(() => {
    const t = this.total();
    return t === 0 ? 0 : Math.round((this.completed() / t) * 100);
  });

  readonly CIRCUMFERENCE = 2 * Math.PI * 44;

  readonly donutSegments = computed(() => {
    const total = this.total();
    if (total === 0) return [];

    const items = [
      { key: 'completed',   label: 'Completados',  color: '#22c55e', count: this.completed() },
      { key: 'in_progress', label: 'En progreso',  color: '#3b82f6', count: this.inProgress() },
      { key: 'pending',     label: 'Pendientes',   color: '#f59e0b', count: this.pending() },
      { key: 'cancelled',   label: 'Cancelados',   color: '#94a3b8', count: this.cancelled() },
    ].filter(s => s.count > 0);

    const circ = this.CIRCUMFERENCE;
    let offset = 0;
    return items.map(s => {
      const segLen = (s.count / total) * circ;
      const dashOffset = -offset;
      offset += segLen;
      return { ...s, pct: Math.round((s.count / total) * 100), dashLen: segLen, dashOffset };
    });
  });

  readonly typeStats = computed(() => {
    const ms = this.maintenanceService.maintenances();
    const counts = {
      preventive: ms.filter(m => m.type === 'preventive').length,
      corrective:  ms.filter(m => m.type === 'corrective').length,
      predictive:  ms.filter(m => m.type === 'predictive').length,
    };
    const max = Math.max(...Object.values(counts), 1);
    return [
      { key: 'preventive', label: 'Preventivo', color: '#3b82f6', count: counts.preventive, pct: Math.round((counts.preventive / max) * 100) },
      { key: 'corrective',  label: 'Correctivo', color: '#ef4444', count: counts.corrective,  pct: Math.round((counts.corrective  / max) * 100) },
      { key: 'predictive',  label: 'Predictivo', color: '#8b5cf6', count: counts.predictive,  pct: Math.round((counts.predictive  / max) * 100) },
    ];
  });

  readonly machineMap = computed(() => {
    const map = new Map<number, string>();
    for (const m of this.machinesService.machines()) map.set(m.id, m.name);
    return map;
  });

  readonly recentMaintenances = computed(() =>
    [...this.maintenanceService.maintenances()]
      .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
      .slice(0, 6)
  );

  readonly typeLabels: Record<string, string> = {
    preventive: 'Preventivo',
    corrective:  'Correctivo',
    predictive:  'Predictivo',
  };

  readonly statusLabels: Record<string, string> = {
    pending:     'Pendiente',
    in_progress: 'En progreso',
    completed:   'Completado',
    cancelled:   'Cancelado',
  };

  ngOnInit(): void {
    this.maintenanceService.load();
    this.machinesService.load();
  }
}
