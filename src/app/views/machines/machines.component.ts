import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';

export type MachineStatus = 'active' | 'inactive' | 'under_maintenance';

export interface Machine {
  id: number;
  code: string;
  name: string;
  location: string;
  serial_number: string;
  status: MachineStatus;
  created_at: string;
}

@Component({
  selector: 'app-machines',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './machines.component.html',
  styleUrl: './machines.component.css',
})
export class MachinesComponent {
  private readonly fb = inject(FormBuilder);
  private readonly supabaseService = inject(SupabaseService);

  readonly machines = signal<Machine[]>([]);
  readonly loading = signal(true);
  readonly modalOpen = signal(false);
  readonly submitting = signal(false);

  readonly statusOptions: { value: MachineStatus; label: string }[] = [
    { value: 'active', label: 'Activo' },
    { value: 'inactive', label: 'Inactivo' },
    { value: 'under_maintenance', label: 'En mantenimiento' },
  ];

  readonly statusLabels: Record<MachineStatus, string> = {
    active: 'Activo',
    inactive: 'Inactivo',
    under_maintenance: 'En mantenimiento',
  };

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    location: ['', [Validators.required, Validators.maxLength(150)]],
    serial_number: [''],
    status: ['active' as MachineStatus, Validators.required],
  });

  constructor() {
    this.loadMachines();
  }

  private async loadMachines(): Promise<void> {
    this.loading.set(true);
    const { data } = await this.supabaseService.supabase
      .from('machines')
      .select('*')
      .order('created_at', { ascending: false });

    this.machines.set((data as Machine[]) ?? []);
    this.loading.set(false);
  }

  openModal(): void {
    this.form.reset({ status: 'active' });
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal__backdrop')) {
      this.closeModal();
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const values = this.form.getRawValue();

    try {
      const { error } = await this.supabaseService.supabase
        .from('machines')
        .insert([values])
        .select();

      if (!error) {
        await this.loadMachines();
        this.closeModal();
      }
    } finally {
      this.submitting.set(false);
    }
  }
}
