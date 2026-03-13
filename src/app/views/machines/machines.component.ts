import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { MachineStatus } from '../../constants/machines.const';
import { ModalComponent } from '../../components/modal/modal.component';


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
  imports: [ReactiveFormsModule, DatePipe, ModalComponent],
  templateUrl: './machines.component.html',
  styleUrl: './machines.component.css',
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class MachinesComponent {
  private readonly fb = inject(FormBuilder);
  private readonly supabaseService = inject(SupabaseService);

  readonly machines = signal<Machine[]>([]);
  readonly loading = signal(true);
  readonly modalOpen = signal(false);
  readonly submitting = signal(false);
  readonly editingMachine = signal<Machine | null>(null);
  readonly openDropdownId = signal<number | null>(null);

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

  readonly form = this.fb.group({
    code          : ['', [Validators.required, Validators.maxLength(50)]],
    name          : ['', [Validators.required, Validators.maxLength(100)]],
    location      : ['', [Validators.required, Validators.maxLength(150)]],
    serial_number : [''],
    status        : ['active' as MachineStatus, Validators.required],
  });

  constructor() {
    this.loadMachines();
  }

  private async loadMachines(): Promise<void> {
    this.loading.set(true);
    const { data } = await this.supabaseService.supabase
      .from('machines')
      .select('*')
      .order('status', { ascending: true });

    this.machines.set((data as Machine[]) ?? []);
    this.loading.set(false);
  }

  openModal(): void {
    this.editingMachine.set(null);
    this.form.reset({ status: 'active' });
    this.modalOpen.set(true);
  }

  openEditModal(machine: Machine): void {
    this.editingMachine.set(machine);
    this.form.setValue({
      code: machine.code,
      name: machine.name,
      location: machine.location,
      serial_number: machine.serial_number ?? '',
      status: machine.status,
    });
    this.openDropdownId.set(null);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingMachine.set(null);
  }

  toggleDropdown(id: number, event: MouseEvent): void {
    event.stopPropagation();
    this.openDropdownId.update(current => (current === id ? null : id));
  }

  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.machines__dropdown')) {
      this.openDropdownId.set(null);
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const values = this.form.getRawValue();
    const editing = this.editingMachine();

    try {
      const query = editing
        ? this.supabaseService.supabase
            .from('machines')
            .update(values)
            .eq('id', editing.id)
            .select()
        : this.supabaseService.supabase
            .from('machines')
            .insert([values])
            .select();

      const { error } = await query;

      if (!error) {
        await this.loadMachines();
        this.closeModal();
      }
    } finally {
      this.submitting.set(false);
    }
  }
}
