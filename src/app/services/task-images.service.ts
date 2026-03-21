import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthStore } from '../core/auth.store';
import { ImageCompressService } from '../utils/image-compress.util';
export interface TaskImage {
  id: number;
  task_id: number;
  storage_path: string;
  url: string;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class TaskImagesService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly authStore = inject(AuthStore);
  private compressService = inject(ImageCompressService)

  private readonly _images = signal<TaskImage[]>([]);
  private readonly _loading = signal(false);
  private readonly _uploading = signal(false);
  private readonly _uploadError = signal<string | null>(null);

  readonly images = this._images.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly uploading = this._uploading.asReadonly();
  readonly uploadError = this._uploadError.asReadonly();

  async loadForTask(taskId: number): Promise<void> {
    this._loading.set(true);
    this._images.set([]);
    try {
      const { data } = await this.supabaseService.supabase
        .from('task_images')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      this._images.set((data as TaskImage[]) ?? []);
    } finally {
      this._loading.set(false);
    }
  }

  async upload(taskId: number, files: File[]): Promise<{ failedCount: number }> {
    this._uploading.set(true)
    this._uploadError.set(null)
    let failedCount = 0
    const userId = this.authStore.session()?.user.id ?? null

    try {
      for (const file of files) {
        let compressed: File

        try {
          compressed = await this.compressService.compress(file, (p) => {
            console.log(`Comprimiendo ${file.name}: ${p}%`)
          })
          this.compressService.logStats(file, compressed)
        } catch {
          compressed = file // fallback al original si falla
        }

        const formData = new FormData()
        formData.append('image', compressed)
        formData.append('task_id', String(taskId))
        if (userId) formData.append('user_id', userId)

        const { data, error } = await this.supabaseService.supabase.functions.invoke('save-image', {
          body: formData,
        })

        if (error) { failedCount++; continue }

        this._images.update(list => [...list, data as TaskImage])
      }

      if (failedCount > 0) {
        this._uploadError.set(
          `${failedCount} imagen${failedCount > 1 ? 'es' : ''} no se pudo${failedCount > 1 ? 'ieron' : ''} subir.`
        )
      }
    } finally {
      this._uploading.set(false)
    }

    return { failedCount }
  }
}
