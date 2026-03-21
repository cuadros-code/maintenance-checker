import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ButtonComponent } from '../../components/button/button.component';
import { ModalComponent } from '../../components/modal/modal.component';
import { MachinesService } from '../../services/machines.service';
import { MaintenanceService, MaintenanceType } from '../../services/maintenance.service';
import {
  MaintenanceTask,
  MaintenanceTaskPayload,
  MaintenanceTaskUpdatePayload,
  MaintenanceTasksService,
  TaskStatus,
} from '../../services/maintenance-tasks.service';
import { TaskImagesService } from '../../services/task-images.service';

@Component({
  selector: 'app-maintenance-tasks-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, ModalComponent, ReactiveFormsModule, DatePipe, RouterLink],
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
  readonly pendingFiles = signal<File[]>([]);
  readonly pendingPreviews = signal<string[]>([]);
  readonly dragOver = signal(false);
  readonly lightboxUrl = signal<string | null>(null);

  readonly taskStatusOptions: { value: TaskStatus; label: string }[] = [
    { value: 'pending',     label: 'Pendiente' },
    { value: 'in_progress', label: 'En progreso' },
    { value: 'completed',   label: 'Completado' },
    { value: 'skipped',     label: 'Omitida' },
  ];

  readonly typeLabels: Record<MaintenanceType, string> = {
    preventive: 'Preventivo',
    corrective: 'Correctivo',
    predictive: 'Predictivo',
  };

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
    this.tasksService.loadForMaintenance(this.maintenanceId);
  }

  onEscape(): void {
    if (this.lightboxUrl()) {
      this.closeLightbox();
    }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

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

  async onStatusChange(task: MaintenanceTask, event: Event): Promise<void> {
    const status = (event.target as HTMLSelectElement).value as TaskStatus;
    await this.tasksService.update(task.id, { status }, this.maintenanceId);
  }

  // ── Add ───────────────────────────────────────────────────────────────────

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
      if (!error) this.closeAddModal();
    } finally {
      this.addSubmitting.set(false);
    }
  }

  // ── Images ────────────────────────────────────────────────────────────────

  openImagesModal(task: MaintenanceTask): void {
    this.imagesModalTask.set(task);
    this.pendingFiles.set([]);
    this.pendingPreviews.set([]);
    this.imagesService.loadForTask(task.id);
  }

  closeImagesModal(): void {
    this.lightboxUrl.set(null);
    this.pendingPreviews().forEach(url => URL.revokeObjectURL(url));
    this.imagesModalTask.set(null);
    this.pendingFiles.set([]);
    this.pendingPreviews.set([]);
  }

  // ── Lightbox ──────────────────────────────────────────────────────────────

  openLightbox(url: string): void {
    this.lightboxUrl.set(url);
  }

  closeLightbox(): void {
    this.lightboxUrl.set(null);
  }

  // ── File upload ───────────────────────────────────────────────────────────

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
