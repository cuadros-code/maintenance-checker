import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ModalComponent } from '../../components/modal/modal.component';
import { ButtonComponent } from '../../components/button/button.component';
import { BadgeComponent } from '../../components/badge/badge.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { AppRole, CreateUserPayload, UsersService } from '../../services/users.service';

@Component({
  selector: 'app-users-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DatePipe, ModalComponent, ButtonComponent, BadgeComponent, EmptyStateComponent],
  templateUrl: './users-view.html',
  styleUrl: './users-view.css',
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class UsersView {
  private readonly fb = inject(FormBuilder);
  readonly usersService = inject(UsersService);

  readonly modalOpen = signal(false);
  readonly submitting = signal(false);
  readonly openDropdownId = signal<string | null>(null);
  readonly dropdownPos = signal<{ top: number; right: number } | null>(null);

  readonly roleOptions: { value: AppRole; label: string }[] = [
    { value: 'admin', label: 'Administrador' },
    { value: 'technician', label: 'Técnico' },
    { value: 'supervisor', label: 'Supervisor' },
  ];

  readonly roleLabels: Record<AppRole, string> = {
    admin: 'Administrador',
    technician: 'Técnico',
    supervisor: 'Supervisor',
  };

  readonly form = this.fb.group({
    email   : ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role    : ['' as AppRole, Validators.required],
  });

  constructor() {
    this.usersService.load();
  }

  openModal(): void {
    this.form.reset({ role: 'technician' });
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  toggleDropdown(id: string, event: MouseEvent): void {
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
    if (!target.closest('.users__dropdown')) {
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

    const payload: CreateUserPayload = {
      email   : raw.email!,
      password: raw.password!,
      role    : raw.role as AppRole,
    };

    try {
      const { error } = await this.usersService.create(payload);
      if (!error) this.closeModal();
    } finally {
      this.submitting.set(false);
    }
  }
}
