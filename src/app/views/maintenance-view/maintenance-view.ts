import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
  readonly machinesService = inject(MachinesService);
  readonly maintenanceService = inject(MaintenanceService);
  readonly authStore = inject(AuthStore);

  readonly modalOpen = signal(false);
  readonly submitting = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly openDropdownId = signal<number | null>(null);

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

  readonly machineMap = computed(() =>
    new Map<number, Machine>(this.machinesService.machines().map(m => [m.id, m]))
  );

  readonly form = this.fb.group({
    machine_id     : [null as number | null, Validators.required],
    type           : ['preventive' as MaintenanceType, Validators.required],
    status         : ['pending' as MaintenanceStatus, Validators.required],
    description    : [''],
    scheduled_at   : ['', Validators.required],
    technician_name: [''],
    notes          : [''],
  });

  readonly minScheduledAt = toLocalDateTimeString(new Date());

  constructor() {
    this.machinesService.load();
    this.maintenanceService.load();
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
      machine_id     : item.machine_id,
      type           : item.type,
      status         : item.status,
      description    : item.description ?? '',
      scheduled_at   : toLocalDateTimeString(new Date(item.scheduled_at)),
      technician_name: item.technician_name ?? '',
      notes          : item.notes ?? '',
    });
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  toggleDropdown(id: number, event: MouseEvent): void {
    event.stopPropagation();
    this.openDropdownId.update(current => (current === id ? null : id));
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
          machine_id     : raw.machine_id!,
          type           : raw.type as MaintenanceType,
          status         : raw.status as MaintenanceStatus,
          description    : raw.description || null,
          scheduled_at   : new Date(raw.scheduled_at!).toISOString(),
          technician_name: raw.technician_name || null,
          notes          : raw.notes || null,
        };
        const { error } = await this.maintenanceService.update(id, payload);
        if (!error) this.closeModal();
      } else {
        const payload: MaintenancePayload = {
          machine_id     : raw.machine_id!,
          type           : raw.type as MaintenanceType,
          description    : raw.description || null,
          scheduled_at   : new Date(raw.scheduled_at!).toISOString(),
          technician_name: raw.technician_name || null,
          notes          : raw.notes || null,
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
