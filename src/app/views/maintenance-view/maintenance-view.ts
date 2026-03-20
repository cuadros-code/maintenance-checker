import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ButtonComponent } from '../../components/button/button.component';
import { ModalComponent } from '../../components/modal/modal.component';
import { Machine, MachinesService } from '../../services/machines.service';
import { AuthStore } from '../../core/auth.store';
import {
  Maintenance,
  MaintenancePayload,
  MaintenanceService,
  MaintenanceStatus,
  MaintenanceType,
  MaintenanceUpdatePayload,
} from '../../services/maintenance.service';
import {
  MaintenanceTasksService,
  MaintenanceTaskPayload,
  TaskStatus,
} from '../../services/maintenance-tasks.service';
import { UsersService } from '../../services/users.service';

@Component({
  selector: 'app-maintenance-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, ModalComponent, ReactiveFormsModule, DatePipe],
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

  readonly isEditing = computed(() => this.editingId() !== null);
  readonly modalTitle = computed(() =>
    this.isEditing() ? 'Editar mantenimiento' : 'Programar mantenimiento'
  );
  readonly submitLabel = computed(() => {
    if (this.submitting()) return 'Guardando…';
    return this.isEditing() ? 'Guardar cambios' : 'Programar';
  });

  readonly typeOptions: { value: MaintenanceType; label: string }[] = [
    { value: 'preventive', label: 'Preventivo' },
    { value: 'corrective', label: 'Correctivo' },
    { value: 'predictive', label: 'Predictivo' },
  ];

  readonly statusOptions: { value: MaintenanceStatus; label: string }[] = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'in_progress', label: 'En progreso' },
    { value: 'completed', label: 'Completado' },
    { value: 'cancelled', label: 'Cancelado' },
  ];

  readonly typeLabels: Record<MaintenanceType, string> = {
    preventive: 'Preventivo',
    corrective: 'Correctivo',
    predictive: 'Predictivo',
  };

  readonly statusLabels: Record<MaintenanceStatus, string> = {
    pending    : 'Pendiente',
    in_progress: 'En progreso',
    completed  : 'Completado',
    cancelled  : 'Cancelado',
  };

  readonly taskStatusLabels: Record<TaskStatus, string> = {
    pending    : 'Pendiente',
    in_progress: 'En progreso',
    completed  : 'Completado',
    skipped    : 'Omitida',
  };

  readonly machineMap = computed(() =>
    new Map<number, Machine>(this.machinesService.machines().map(m => [m.id, m]))
  );

  readonly userMap = computed(() =>
    new Map(this.usersService.users().map(u => [u.id, u]))
  );

  readonly form = this.fb.group({
    machine_id      : [null as number | null, Validators.required],
    type            : ['preventive' as MaintenanceType, Validators.required],
    status          : ['pending' as MaintenanceStatus, Validators.required],
    description     : [''],
    scheduled_at    : ['', Validators.required],
    notes           : [''],
    assigned_user_id: [null as string | null],
  });

  readonly taskStatusOptions: { value: TaskStatus; label: string }[] = [
    { value: 'pending',     label: 'Pendiente' },
    { value: 'in_progress', label: 'En progreso' },
    { value: 'completed',   label: 'Completado' },
    { value: 'skipped',     label: 'Omitida' },
  ];

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
