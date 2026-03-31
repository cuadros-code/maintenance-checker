import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ButtonComponent } from '../../components/button/button.component';
import { ModalComponent } from '../../components/modal/modal.component';
import { BadgeComponent } from '../../components/badge/badge.component';
import { SpinnerComponent } from '../../components/spinner/spinner.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { MachinesService } from '../../services/machines.service';
import { MaintenanceService } from '../../services/maintenance.service';
import {
  MaintenanceTask,
  MaintenanceTaskPayload,
  MaintenanceTaskUpdatePayload,
  MaintenanceTasksService,
} from '../../services/maintenance-tasks.service';
import {
  MaintenanceType,
  TaskStatus,
  MAINTENANCE_TYPE_LABELS,
  TASK_STATUS_OPTIONS,
} from '../../constants/domain.const';
import { TaskImagesService } from '../../services/task-images.service';
import { TasksReportService } from '../../services/tasks-report.service';
import { AuthStore } from '../../core/auth.store';

@Component({
  selector: 'app-maintenance-tasks-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, ModalComponent, BadgeComponent, SpinnerComponent, EmptyStateComponent, ReactiveFormsModule, DatePipe, RouterLink],
  templateUrl: './maintenance-tasks-view.html',
  styleUrl: './maintenance-tasks-view.css',
  host: {
    '(keydown.escape)': 'onEscape()',
  },
})
export class MaintenanceTasksView {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  readonly tasksService = inject(MaintenanceTasksService);
  readonly imagesService = inject(TaskImagesService);
  private readonly maintenanceService = inject(MaintenanceService);
  private readonly machinesService = inject(MachinesService);
  private readonly authStore = inject(AuthStore);
  private readonly reportService = inject(TasksReportService);

  readonly isAdmin = this.authStore.isAdmin;

  readonly maintenanceId = Number(this.route.snapshot.paramMap.get('id'));

  readonly maintenance = computed(() =>
    this.maintenanceService.maintenances().find(m => m.id === this.maintenanceId) ?? null
  );

  readonly machine = computed(() => {
    const m = this.maintenance();
    if (!m) return null;
    return this.machinesService.machines().find(mac => mac.id === m.machine_id) ?? null;
  });

  readonly editingTask = signal<MaintenanceTask | null>(null);
  readonly editModalOpen = computed(() => this.editingTask() !== null);
  readonly editSubmitting = signal(false);

  readonly addModalOpen = signal(false);
  readonly addSubmitting = signal(false);

  readonly imagesModalTask = signal<MaintenanceTask | null>(null);
  readonly imagesModalOpen = computed(() => this.imagesModalTask() !== null);
  readonly imagesModalMode = signal<'view' | 'upload'>('view');
  readonly pendingFiles = signal<File[]>([]);
  readonly pendingPreviews = signal<string[]>([]);
  readonly dragOver = signal(false);
  readonly confirmDeleteTask = signal<MaintenanceTask | null>(null);
  readonly lightboxIndex = signal<number | null>(null);
  readonly lightboxUrl = computed(() => {
    const idx = this.lightboxIndex();
    if (idx === null) return null;
    return this.imagesService.images()[idx]?.url ?? null;
  });
  readonly lightboxHasPrev = computed(() => {
    const idx = this.lightboxIndex();
    return idx !== null && idx > 0;
  });
  readonly lightboxHasNext = computed(() => {
    const idx = this.lightboxIndex();
    return idx !== null && idx < this.imagesService.images().length - 1;
  });

  readonly exportingPdf = signal(false);

  readonly taskStatusOptions = TASK_STATUS_OPTIONS;

  readonly columns: { status: TaskStatus; label: string }[] = [
    { status: 'pending',     label: 'Pendiente'   },
    { status: 'in_progress', label: 'En progreso' },
    { status: 'completed',   label: 'Completado'  },
    { status: 'skipped',     label: 'Omitida'     },
  ];

  readonly tasksByStatus = computed(() => {
    const tasks = this.tasksService.tasks();
    const map: Record<TaskStatus, MaintenanceTask[]> = {
      pending:     [],
      in_progress: [],
      completed:   [],
      skipped:     [],
    };
    for (const t of tasks) map[t.status].push(t);
    return map;
  });

  readonly typeLabels = MAINTENANCE_TYPE_LABELS;

  readonly editForm = this.fb.group({
    title      : ['', Validators.required],
    description: [''],
    status     : ['pending' as TaskStatus, Validators.required],
    notes      : [''],
  });

  readonly addForm = this.fb.group({
    title      : ['', Validators.required],
    description: [''],
    status     : ['pending' as TaskStatus, Validators.required],
    notes      : [''],
  });

  constructor() {
    this.maintenanceService.load();
    this.machinesService.load();
    this.loadTasksAndCounts();
  }

  private async loadTasksAndCounts(): Promise<void> {
    await this.tasksService.loadForMaintenance(this.maintenanceId);
    const ids = this.tasksService.tasks().map(t => t.id);
    await this.imagesService.loadCountsForTasks(ids);
  }

  onEscape(): void {
    if (this.lightboxIndex() !== null) {
      this.closeLightbox();
    }
  }

  onLightboxKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft')  this.prevImage();
    if (event.key === 'ArrowRight') this.nextImage();
  }

  openEditModal(task: MaintenanceTask): void {
    this.editingTask.set(task);
    this.editForm.reset({
      title      : task.title,
      description: task.description ?? '',
      status     : task.status,
      notes      : task.notes ?? '',
    });
  }

  closeEditModal(): void {
    this.editingTask.set(null);
  }

  async submitEdit(): Promise<void> {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const task = this.editingTask();
    if (!task) return;

    this.editSubmitting.set(true);
    const raw = this.editForm.getRawValue();
    try {
      const payload: MaintenanceTaskUpdatePayload = {
        title      : raw.title!,
        description: raw.description || null,
        status     : raw.status as TaskStatus,
        notes      : raw.notes || null,
      };
      const { error } = await this.tasksService.update(task.id, payload, this.maintenanceId);
      if (!error) this.closeEditModal();
    } finally {
      this.editSubmitting.set(false);
    }
  }

  async onStatusChange(task: MaintenanceTask, status: TaskStatus): Promise<void> {
    if (task.status === status) return;
    await this.tasksService.update(task.id, { status }, this.maintenanceId);
  }

  async toggleComplete(task: MaintenanceTask): Promise<void> {
    const status: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    await this.tasksService.update(task.id, { status }, this.maintenanceId);
  }

  readonly deletingTask = signal(false);

  requestDelete(task: MaintenanceTask): void {
    this.confirmDeleteTask.set(task);
  }

  cancelDelete(): void {
    this.confirmDeleteTask.set(null);
  }

  async confirmDelete(): Promise<void> {
    const task = this.confirmDeleteTask();
    if (!task) return;
    this.deletingTask.set(true);
    try {
      await this.tasksService.delete(task.id, this.maintenanceId);
      this.confirmDeleteTask.set(null);
    } finally {
      this.deletingTask.set(false);
    }
  }


  openAddModal(): void {
    this.addForm.reset({ status: 'pending' });
    this.addModalOpen.set(true);
  }

  closeAddModal(): void {
    this.addModalOpen.set(false);
  }

  async submitAdd(): Promise<void> {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }
    this.addSubmitting.set(true);
    const raw = this.addForm.getRawValue();
    try {
      const payload: MaintenanceTaskPayload = {
        maintenance_id: this.maintenanceId,
        title         : raw.title!,
        description   : raw.description || null,
        order_index   : this.tasksService.tasks().length,
        status        : raw.status as TaskStatus,
        notes         : raw.notes || null,
      };
      const { error } = await this.tasksService.create(payload);
      if (!error) {
        const tasks = this.tasksService.tasks();
        const newest = tasks[tasks.length - 1];
        if (newest) this.imagesService.updateCountForTask(newest.id, 0);
        this.closeAddModal();
      }
    } finally {
      this.addSubmitting.set(false);
    }
  }

  openImagesModal(task: MaintenanceTask, mode: 'view' | 'upload' = 'view'): void {
    this.imagesModalTask.set(task);
    this.imagesModalMode.set(mode);
    this.pendingFiles.set([]);
    this.pendingPreviews.set([]);
    this.imagesService.loadForTask(task.id);
  }

  switchToUpload(): void {
    this.imagesModalMode.set('upload');
  }

  closeImagesModal(): void {
    const task = this.imagesModalTask();
    if (task) {
      this.imagesService.updateCountForTask(task.id, this.imagesService.images().length);
    }
    this.lightboxIndex.set(null);
    this.pendingPreviews().forEach(url => URL.revokeObjectURL(url));
    this.imagesModalTask.set(null);
    this.pendingFiles.set([]);
    this.pendingPreviews.set([]);
    this.imagesModalMode.set('view');
  }

  openLightbox(index: number): void {
    this.lightboxIndex.set(index);
  }

  closeLightbox(): void {
    this.lightboxIndex.set(null);
  }

  prevImage(): void {
    const idx = this.lightboxIndex();
    if (idx !== null && idx > 0) this.lightboxIndex.set(idx - 1);
  }

  nextImage(): void {
    const idx = this.lightboxIndex();
    if (idx !== null && idx < this.imagesService.images().length - 1)
      this.lightboxIndex.set(idx + 1);
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addFiles(Array.from(input.files ?? []));
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(): void {
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const files = Array.from(event.dataTransfer?.files ?? []).filter(f =>
      f.type.startsWith('image/')
    );
    this.addFiles(files);
  }

  onDropzoneKeydown(event: KeyboardEvent, fileInput: HTMLInputElement): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fileInput.click();
    }
  }

  private addFiles(files: File[]): void {
    const previews = files.map(f => URL.createObjectURL(f));
    this.pendingFiles.update(prev => [...prev, ...files]);
    this.pendingPreviews.update(prev => [...prev, ...previews]);
  }

  removePendingFile(index: number): void {
    const preview = this.pendingPreviews()[index];
    if (preview) URL.revokeObjectURL(preview);
    this.pendingFiles.update(files => files.filter((_, i) => i !== index));
    this.pendingPreviews.update(prev => prev.filter((_, i) => i !== index));
  }

  async generateReport(): Promise<void> {
    const maintenance = this.maintenance();
    if (!maintenance || this.exportingPdf()) return;
    this.exportingPdf.set(true);
    try {
      await this.reportService.generatePdf(
        this.tasksService.tasks(),
        maintenance,
        this.machine(),
      );
    } finally {
      this.exportingPdf.set(false);
    }
  }

  // ── Quick-add ──────────────────────────────────────────────────────────
  readonly activeQuickAdd = signal<TaskStatus | null>(null);
  readonly quickAddTitle = signal('');
  readonly quickAddSubmitting = signal(false);

  openQuickAdd(status: TaskStatus): void {
    this.activeQuickAdd.set(status);
    this.quickAddTitle.set('');
    setTimeout(() => {
      (document.querySelector('.tv__quick-add-input') as HTMLInputElement | null)?.focus();
    }, 0);
  }

  cancelQuickAdd(): void {
    this.activeQuickAdd.set(null);
    this.quickAddTitle.set('');
  }

  async submitQuickAdd(status: TaskStatus): Promise<void> {
    const title = this.quickAddTitle().trim();
    if (!title || this.quickAddSubmitting()) return;
    const capturedTitle = title;
    this.cancelQuickAdd();
    this.quickAddSubmitting.set(true);
    try {
      const payload: MaintenanceTaskPayload = {
        maintenance_id: this.maintenanceId,
        title: capturedTitle,
        description: null,
        order_index: this.tasksService.tasks().length,
        status,
        notes: null,
      };
      const { error } = await this.tasksService.create(payload);
      if (!error) {
        const tasks = this.tasksService.tasks();
        const newest = tasks[tasks.length - 1];
        if (newest) this.imagesService.updateCountForTask(newest.id, 0);
      }
    } finally {
      this.quickAddSubmitting.set(false);
    }
  }

  onQuickAddKeydown(event: KeyboardEvent, status: TaskStatus): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.submitQuickAdd(status);
    } else if (event.key === 'Escape') {
      this.cancelQuickAdd();
    }
  }

  // ── Inline notes ───────────────────────────────────────────────────────
  readonly inlineEditingNoteId = signal<number | null>(null);
  readonly inlineNoteValue = signal('');

  startInlineNote(task: MaintenanceTask): void {
    this.inlineEditingNoteId.set(task.id);
    this.inlineNoteValue.set(task.notes ?? '');
    setTimeout(() => {
      const ta = document.querySelector('.tv__inline-note-input') as HTMLTextAreaElement | null;
      if (ta) {
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
      }
    }, 0);
  }

  async saveInlineNote(task: MaintenanceTask): Promise<void> {
    if (this.inlineEditingNoteId() !== task.id) return;
    const value = this.inlineNoteValue().trim() || null;
    this.cancelInlineNote();
    if (value !== (task.notes ?? null)) {
      await this.tasksService.update(task.id, { notes: value }, this.maintenanceId);
    }
  }

  cancelInlineNote(): void {
    this.inlineEditingNoteId.set(null);
    this.inlineNoteValue.set('');
  }

  onInlineNoteKeydown(event: KeyboardEvent, task: MaintenanceTask): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelInlineNote();
    } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      this.saveInlineNote(task);
    }
  }

  async uploadImages(): Promise<void> {
    const task = this.imagesModalTask();
    const files = this.pendingFiles();
    if (!task || files.length === 0) return;

    const { failedCount } = await this.imagesService.upload(task.id, files);
    if (failedCount === 0) {
      this.pendingPreviews().forEach(url => URL.revokeObjectURL(url));
      this.pendingFiles.set([]);
      this.pendingPreviews.set([]);
    }
  }
}
