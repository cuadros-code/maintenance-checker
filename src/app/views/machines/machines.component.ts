import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MachineStatus } from '../../constants/machines.const';
import { Machine, MachinesService } from '../../services/machines.service';
import { ModalComponent } from '../../components/modal/modal.component';
import { AuthStore } from '../../core/auth.store';
import { ButtonComponent } from '../../components/button/button.component';

@Component({
  selector: 'app-machines',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DatePipe, ModalComponent, ButtonComponent],
  templateUrl: './machines.component.html',
  styleUrl: './machines.component.css',
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class MachinesComponent {
  private readonly fb = inject(FormBuilder);
  readonly machinesService = inject(MachinesService);
  readonly authStore = inject(AuthStore);

  readonly modalOpen = signal(false);
  readonly submitting = signal(false);
  readonly editingMachine = signal<Machine | null>(null);
  readonly openDropdownId = signal<number | null>(null);
  readonly dropdownPos = signal<{ top: number; right: number } | null>(null);

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
    this.machinesService.load();
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
      const { error } = editing
        ? await this.machinesService.update(editing.id, values as never)
        : await this.machinesService.create(values as never);

      if (!error) this.closeModal();
    } finally {
      this.submitting.set(false);
    }
  }
}
