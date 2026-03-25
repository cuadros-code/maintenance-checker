import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ButtonComponent } from '../../components/button/button.component';
import { ModalComponent } from '../../components/modal/modal.component';
import { BadgeComponent } from '../../components/badge/badge.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { Machine, MachinesService } from '../../services/machines.service';
import { AuthStore } from '../../core/auth.store';
import {
  MaintenanceType,
  MaintenanceStatus,
  TaskStatus,
  MAINTENANCE_TYPE_LABELS,
  MAINTENANCE_TYPE_OPTIONS,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_STATUS_OPTIONS,
  TASK_STATUS_LABELS,
  TASK_STATUS_OPTIONS,
} from '../../constants/domain.const';
import {
  Maintenance,
  MaintenancePayload,
  MaintenanceService,
  MaintenanceUpdatePayload,
} from '../../services/maintenance.service';
import {
  MaintenanceTasksService,
  MaintenanceTaskPayload,
} from '../../services/maintenance-tasks.service';
import { UsersService } from '../../services/users.service';

@Component({
  selector: 'app-maintenance-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, ModalComponent, BadgeComponent, EmptyStateComponent, ReactiveFormsModule, DatePipe],
  templateUrl: './maintenance-view.html',
  styleUrl: './maintenance-view.css',
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class MaintenanceView {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  readonly machinesService = inject(MachinesService);
  readonly maintenanceService = inject(MaintenanceService);
  readonly tasksService = inject(MaintenanceTasksService);
  readonly authStore = inject(AuthStore);
  readonly usersService = inject(UsersService);

  // ── Modals / UI state ───────────────────────────────────────────────────
  readonly modalOpen = signal(false);
  readonly submitting = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly openDropdownId = signal<number | null>(null);
  readonly dropdownPos = signal<{ top: number; right: number } | null>(null);
  readonly deleteTargetId = signal<number | null>(null);
  readonly deleting = signal(false);

  readonly tasksModalItem = signal<Maintenance | null>(null);
  readonly tasksModalOpen = computed(() => this.tasksModalItem() !== null);
  readonly taskSubmitting = signal(false);

  // ── Filters ─────────────────────────────────────────────────────────────
  readonly searchQuery  = signal('');
  readonly filterStatus = signal<MaintenanceStatus | ''>('');
  readonly filterType   = signal<MaintenanceType | ''>('');
  readonly filterDateFrom = signal('');
  readonly filterDateTo   = signal('');

  readonly filteredMaintenances = computed(() => {
    const query    = this.searchQuery().toLowerCase().trim();
    const status   = this.filterStatus();
    const type     = this.filterType();
    const dateFrom = this.filterDateFrom();
    const dateTo   = this.filterDateTo();
    const machines = this.machineMap();

    return this.maintenanceService.maintenances().filter(m => {
      if (status && m.status !== status) return false;
      if (type   && m.type   !== type)   return false;

      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (new Date(m.scheduled_at) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(m.scheduled_at) > to) return false;
      }

      if (query) {
        const machine  = machines.get(m.machine_id);
        const haystack = [
          machine?.name ?? '',
          machine?.code ?? '',
          m.description ?? '',
        ].join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  });

  readonly activeFilterCount = computed(() =>
    [
      this.searchQuery().trim(),
      this.filterStatus(),
      this.filterType(),
      this.filterDateFrom(),
      this.filterDateTo(),
    ].filter(Boolean).length
  );

  // ── Pagination ───────────────────────────────────────────────────────────
  readonly PAGE_SIZE = 10;
  readonly currentPage = signal(1);

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredMaintenances().length / this.PAGE_SIZE))
  );

  readonly effectivePage = computed(() =>
    Math.min(this.currentPage(), this.totalPages())
  );

  readonly paginatedMaintenances = computed(() => {
    const start = (this.effectivePage() - 1) * this.PAGE_SIZE;
    return this.filteredMaintenances().slice(start, start + this.PAGE_SIZE);
  });

  readonly pageRange = computed(() => {
    const start = (this.effectivePage() - 1) * this.PAGE_SIZE + 1;
    const end   = Math.min(this.effectivePage() * this.PAGE_SIZE, this.filteredMaintenances().length);
    return { start, end, total: this.filteredMaintenances().length };
  });

  readonly visiblePages = computed<(number | null)[]>(() => {
    const total   = this.totalPages();
    const current = this.effectivePage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | null)[] = [1];
    if (current > 3)  pages.push(null);
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
    if (current < total - 2) pages.push(null);
    pages.push(total);
    return pages;
  });

  goToPage(page: number): void   { this.currentPage.set(page); }
  prevPage(): void               { this.currentPage.update(p => Math.max(1, p - 1)); }
  nextPage(): void               { this.currentPage.update(p => p + 1); }

  clearFilters(): void {
    this.searchQuery.set('');
    this.filterStatus.set('');
    this.filterType.set('');
    this.filterDateFrom.set('');
    this.filterDateTo.set('');
    this.currentPage.set(1);
  }

  onFilterChange(): void { this.currentPage.set(1); }

  // ── Computed labels / options ───────────────────────────────────────────
  readonly isEditing = computed(() => this.editingId() !== null);
  readonly modalTitle = computed(() =>
    this.isEditing() ? 'Editar mantenimiento' : 'Programar mantenimiento'
  );
  readonly submitLabel = computed(() => {
    if (this.submitting()) return 'Guardando…';
    return this.isEditing() ? 'Guardar cambios' : 'Programar';
  });

  readonly typeOptions    = MAINTENANCE_TYPE_OPTIONS;
  readonly statusOptions  = MAINTENANCE_STATUS_OPTIONS;
  readonly typeLabels     = MAINTENANCE_TYPE_LABELS;
  readonly statusLabels   = MAINTENANCE_STATUS_LABELS;
  readonly taskStatusLabels = TASK_STATUS_LABELS;

  readonly machineMap = computed(() =>
    new Map<number, Machine>(this.machinesService.machines().map(m => [m.id, m]))
  );

  readonly userMap = computed(() =>
    new Map(this.usersService.users().map(u => [u.id, u]))
  );

  // ── Forms ───────────────────────────────────────────────────────────────
  readonly form = this.fb.group({
    machine_id      : [null as number | null, Validators.required],
    type            : ['preventive' as MaintenanceType, Validators.required],
    status          : ['pending' as MaintenanceStatus, Validators.required],
    description     : [''],
    scheduled_at    : ['', Validators.required],
    notes           : [''],
    assigned_user_id: [null as string | null],
  });

  readonly taskStatusOptions = TASK_STATUS_OPTIONS;

  readonly taskForm = this.fb.group({
    title      : ['', Validators.required],
    description: [''],
    status     : ['pending' as TaskStatus, Validators.required],
    notes      : [''],
  });

  readonly minScheduledAt = toLocalDateTimeString(new Date());

  constructor() {
    this.machinesService.load();
    this.maintenanceService.load();
    this.usersService.load();
  }

  // ── Modal actions ────────────────────────────────────────────────────────
  openModal(): void {
    this.editingId.set(null);
    this.form.reset({ type: 'preventive', status: 'pending' });
    this.modalOpen.set(true);
  }

  openEditModal(item: Maintenance): void {
    this.editingId.set(item.id);
    this.openDropdownId.set(null);
    this.form.reset({
      machine_id      : item.machine_id,
      type            : item.type,
      status          : item.status,
      description     : item.description ?? '',
      scheduled_at    : toLocalDateTimeString(new Date(item.scheduled_at)),
      notes           : item.notes ?? '',
      assigned_user_id: item.assigned_user_id ?? null,
    });
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  openDeleteConfirm(item: Maintenance): void {
    this.openDropdownId.set(null);
    this.deleteTargetId.set(item.id);
  }

  cancelDelete(): void {
    this.deleteTargetId.set(null);
  }

  async confirmDelete(): Promise<void> {
    const id = this.deleteTargetId();
    if (id === null) return;
    this.deleting.set(true);
    try {
      await this.maintenanceService.delete(id);
      this.deleteTargetId.set(null);
    } finally {
      this.deleting.set(false);
    }
  }

  goToTasks(item: Maintenance): void {
    this.openDropdownId.set(null);
    this.router.navigate(['/dashboard/mantenimientos', item.id, 'tareas']);
  }

  openTasksModal(item: Maintenance): void {
    this.openDropdownId.set(null);
    this.tasksModalItem.set(item);
    this.taskForm.reset({ status: 'pending' });
    this.tasksService.loadForMaintenance(item.id);
  }

  closeTasksModal(): void {
    this.tasksModalItem.set(null);
  }

  async submitTask(): Promise<void> {
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    const item = this.tasksModalItem();
    if (!item) return;

    this.taskSubmitting.set(true);
    const raw = this.taskForm.getRawValue();

    try {
      const payload: MaintenanceTaskPayload = {
        maintenance_id: item.id,
        title         : raw.title!,
        description   : raw.description || null,
        order_index   : this.tasksService.tasks().length,
        status        : raw.status as TaskStatus,
        notes         : raw.notes || null,
      };
      const { error } = await this.tasksService.create(payload);
      if (!error) this.taskForm.reset({ status: 'pending' });
    } finally {
      this.taskSubmitting.set(false);
    }
  }

  toggleDropdown(id: number, event: MouseEvent): void {
    event.stopPropagation();
    if (this.openDropdownId() === id) {
      this.openDropdownId.set(null);
      this.dropdownPos.set(null);
    } else {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      this.dropdownPos.set({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
      this.openDropdownId.set(id);
    }
  }

  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.maintenance__dropdown')) {
      this.openDropdownId.set(null);
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const raw = this.form.getRawValue();

    try {
      const id = this.editingId();
      if (id !== null) {
        const payload: MaintenanceUpdatePayload = {
          machine_id      : raw.machine_id!,
          type            : raw.type as MaintenanceType,
          status          : raw.status as MaintenanceStatus,
          description     : raw.description || null,
          scheduled_at    : new Date(raw.scheduled_at!).toISOString(),
          notes           : raw.notes || null,
          assigned_user_id: raw.assigned_user_id || null,
        };
        const { error } = await this.maintenanceService.update(id, payload);
        if (!error) this.closeModal();
      } else {
        const payload: MaintenancePayload = {
          machine_id      : raw.machine_id!,
          type            : raw.type as MaintenanceType,
          description     : raw.description || null,
          scheduled_at    : new Date(raw.scheduled_at!).toISOString(),
          notes           : raw.notes || null,
          assigned_user_id: raw.assigned_user_id || null,
        };
        const { error } = await this.maintenanceService.create(payload);
        if (!error) this.closeModal();
      }
    } finally {
      this.submitting.set(false);
    }
  }
}

function toLocalDateTimeString(date: Date): string {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
