import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ButtonComponent } from '../../components/button/button.component';
import { ModalComponent } from '../../components/modal/modal.component';
import { Machine, MachinesService } from '../../services/machines.service';
import { MaintenancePayload, MaintenanceService, MaintenanceStatus, MaintenanceType } from '../../services/maintenance.service';

@Component({
  selector: 'app-maintenance-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, ModalComponent, ReactiveFormsModule, DatePipe],
  templateUrl: './maintenance-view.html',
  styleUrl: './maintenance-view.css',
})
export class MaintenanceView {
  private readonly fb = inject(FormBuilder);
  readonly machinesService = inject(MachinesService);
  readonly maintenanceService = inject(MaintenanceService);

  readonly modalOpen = signal(false);
  readonly submitting = signal(false);

  readonly typeOptions: { value: MaintenanceType; label: string }[] = [
    { value: 'preventive', label: 'Preventivo' },
    { value: 'corrective', label: 'Correctivo' },
    { value: 'predictive', label: 'Predictivo' },
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

  /** Map for fast machine lookup by id in the table. */
  readonly machineMap = computed(() =>
    new Map<number, Machine>(this.machinesService.machines().map(m => [m.id, m]))
  );

  readonly form = this.fb.group({
    machine_id     : [null as number | null, Validators.required],
    type           : ['preventive' as MaintenanceType, Validators.required],
    description    : [''],
    scheduled_at   : ['', Validators.required],
    technician_name: [''],
    notes          : [''],
  });

  /** Min value for the datetime-local input (now, in local time). */
  readonly minScheduledAt = toLocalDateTimeString(new Date());

  constructor() {
    this.machinesService.load();
    this.maintenanceService.load();
  }

  openModal(): void {
    this.form.reset({ type: 'preventive' });
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const raw = this.form.getRawValue();

    const payload: MaintenancePayload = {
      machine_id     : raw.machine_id!,
      type           : raw.type as MaintenanceType,
      description    : raw.description || null,
      scheduled_at   : new Date(raw.scheduled_at!).toISOString(),
      technician_name: raw.technician_name || null,
      notes          : raw.notes || null,
    };

    try {
      const { error } = await this.maintenanceService.create(payload);
      if (!error) this.closeModal();
    } finally {
      this.submitting.set(false);
    }
  }
}

function toLocalDateTimeString(date: Date): string {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
