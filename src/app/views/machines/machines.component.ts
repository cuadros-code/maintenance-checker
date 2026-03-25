import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MachineStatus, MACHINE_STATUS_LABELS, MACHINE_STATUS_OPTIONS } from '../../constants/domain.const';
import { Machine, MachinesService } from '../../services/machines.service';
import { ModalComponent } from '../../components/modal/modal.component';
import { AuthStore } from '../../core/auth.store';
import { ButtonComponent } from '../../components/button/button.component';
import { BadgeComponent } from '../../components/badge/badge.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';

@Component({
  selector: 'app-machines',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DatePipe, ModalComponent, ButtonComponent, BadgeComponent, EmptyStateComponent],
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

  // ── Filters ─────────────────────────────────────────────────────────────
  readonly searchQuery  = signal('');
  readonly filterStatus = signal<MachineStatus | ''>('');

  readonly filteredMachines = computed(() => {
    const query  = this.searchQuery().toLowerCase().trim();
    const status = this.filterStatus();

    return this.machinesService.machines().filter(m => {
      if (status && m.status !== status) return false;
      if (query) {
        const haystack = [m.code, m.name, m.location].join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  });

  readonly activeFilterCount = computed(() =>
    [this.searchQuery().trim(), this.filterStatus()].filter(Boolean).length
  );

  // ── Pagination ───────────────────────────────────────────────────────────
  readonly PAGE_SIZE = 10;
  readonly currentPage = signal(1);

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredMachines().length / this.PAGE_SIZE))
  );

  readonly effectivePage = computed(() =>
    Math.min(this.currentPage(), this.totalPages())
  );

  readonly paginatedMachines = computed(() => {
    const start = (this.effectivePage() - 1) * this.PAGE_SIZE;
    return this.filteredMachines().slice(start, start + this.PAGE_SIZE);
  });

  readonly pageRange = computed(() => {
    const start = (this.effectivePage() - 1) * this.PAGE_SIZE + 1;
    const end   = Math.min(this.effectivePage() * this.PAGE_SIZE, this.filteredMachines().length);
    return { start, end, total: this.filteredMachines().length };
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

  goToPage(page: number): void { this.currentPage.set(page); }
  prevPage(): void             { this.currentPage.update(p => Math.max(1, p - 1)); }
  nextPage(): void             { this.currentPage.update(p => p + 1); }

  clearFilters(): void {
    this.searchQuery.set('');
    this.filterStatus.set('');
    this.currentPage.set(1);
  }

  onFilterChange(): void { this.currentPage.set(1); }

  // ── Options / labels ─────────────────────────────────────────────────────
  readonly statusOptions = MACHINE_STATUS_OPTIONS;
  readonly statusLabels  = MACHINE_STATUS_LABELS;

  readonly form = this.fb.group({
    code         : ['', [Validators.required, Validators.maxLength(50)]],
    name         : ['', [Validators.required, Validators.maxLength(100)]],
    location     : ['', [Validators.required, Validators.maxLength(150)]],
    serial_number: [''],
    status       : ['active' as MachineStatus, Validators.required],
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
      code         : machine.code,
      name         : machine.name,
      location     : machine.location,
      serial_number: machine.serial_number ?? '',
      status       : machine.status,
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
