import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MaintenanceService, Maintenance } from '../../services/maintenance.service';
import { MachinesService } from '../../services/machines.service';
import {
  MAINTENANCE_TYPE_LABELS,
  MAINTENANCE_STATUS_LABELS,
} from '../../constants/domain.const';

type CalendarViewType = 'month' | 'week';

interface CalendarDay {
  date: Date;
  iso: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  events: Maintenance[];
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

@Component({
  selector: 'app-calendar-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink],
  templateUrl: './calendar-view.html',
  styleUrl: './calendar-view.css',
  host: { '(click)': 'closeDetail()' },
})
export class CalendarView implements OnInit {
  private readonly maintenanceService = inject(MaintenanceService);
  private readonly machinesService = inject(MachinesService);

  readonly view = signal<CalendarViewType>('month');
  readonly currentDate = signal(new Date());
  readonly selectedEvent = signal<Maintenance | null>(null);
  readonly selectedMachineId = signal<number | null>(null);

  readonly machines = computed(() => this.machinesService.machines());
  readonly loading = computed(() => this.maintenanceService.loading());

  readonly machineMap = computed(() => {
    const map = new Map<number, string>();
    for (const m of this.machinesService.machines()) map.set(m.id, m.name);
    return map;
  });

  readonly filteredMaintenances = computed(() => {
    const id = this.selectedMachineId();
    const all = this.maintenanceService.maintenances();
    return id === null ? all : all.filter(m => m.machine_id === id);
  });

  readonly headerLabel = computed(() => {
    const d = this.currentDate();
    if (this.view() === 'month') {
      return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    }
    const weekStart = this.getWeekStart(d);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return `${weekStart.getDate()}–${weekEnd.getDate()} ${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
    }
    return `${weekStart.getDate()} ${MONTH_NAMES[weekStart.getMonth()]} – ${weekEnd.getDate()} ${MONTH_NAMES[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;
  });

  readonly calendarDays = computed((): CalendarDay[] => {
    const d = this.currentDate();
    const year = d.getFullYear();
    const month = d.getMonth();
    const todayIso = this.toIso(new Date());

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = (firstDay.getDay() + 6) % 7; // Mon = 0
    const totalCells = Math.ceil((startPadding + lastDay.getDate()) / 7) * 7;

    const days: CalendarDay[] = [];

    for (let i = startPadding - 1; i >= 0; i--) {
      days.push(this.buildDay(new Date(year, month, -i), false, todayIso));
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(this.buildDay(new Date(year, month, i), true, todayIso));
    }
    for (let i = 1; days.length < totalCells; i++) {
      days.push(this.buildDay(new Date(year, month + 1, i), false, todayIso));
    }

    const maintenances = this.filteredMaintenances();
    for (const m of maintenances) {
      const iso = this.toIso(new Date(m.scheduled_at));
      const day = days.find(day => day.iso === iso);
      if (day) day.events.push(m);
    }

    return days;
  });

  readonly calendarRows = computed(() => this.calendarDays().length / 7);

  readonly weekDays = computed((): CalendarDay[] => {
    const d = this.currentDate();
    const weekStart = this.getWeekStart(d);
    const todayIso = this.toIso(new Date());

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const day = this.buildDay(date, true, todayIso);
      day.events = this.filteredMaintenances().filter(
        m => this.toIso(new Date(m.scheduled_at)) === day.iso,
      );
      return day;
    });
  });

  readonly dayNames = DAY_NAMES;
  readonly typeLabels = MAINTENANCE_TYPE_LABELS;
  readonly statusLabels = MAINTENANCE_STATUS_LABELS;
  readonly MAX_CHIPS = 3;

  prev(): void {
    const d = new Date(this.currentDate());
    if (this.view() === 'month') d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 7);
    this.currentDate.set(d);
  }

  next(): void {
    const d = new Date(this.currentDate());
    if (this.view() === 'month') d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 7);
    this.currentDate.set(d);
  }

  goToToday(): void {
    this.currentDate.set(new Date());
  }

  setView(v: CalendarViewType): void {
    this.view.set(v);
    this.selectedEvent.set(null);
  }

  openDetail(event: Event, m: Maintenance): void {
    event.stopPropagation();
    this.selectedEvent.update(cur => (cur?.id === m.id ? null : m));
  }

  closeDetail(): void {
    this.selectedEvent.set(null);
  }

  selectMachine(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedMachineId.set(value === '' ? null : Number(value));
  }

  isOverdue(m: Maintenance): boolean {
    if (m.status === 'completed' || m.status === 'cancelled') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(m.scheduled_at) < today;
  }

  private buildDay(date: Date, isCurrentMonth: boolean, todayIso: string): CalendarDay {
    const dow = date.getDay();
    return {
      date,
      iso: this.toIso(date),
      isCurrentMonth,
      isToday: this.toIso(date) === todayIso,
      isWeekend: dow === 0 || dow === 6,
      events: [],
    };
  }

  private getWeekStart(d: Date): Date {
    const date = new Date(d);
    const dow = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - dow);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private toIso(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  ngOnInit(): void {
    this.maintenanceService.load();
    this.machinesService.load();
  }
}
