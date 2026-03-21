// image-compress.service.ts
import { Injectable } from '@angular/core'
import imageCompression from 'browser-image-compression'

@Injectable({ providedIn: 'root' })
export class ImageCompressService {

  private readonly HEIC_EXTENSIONS = ['.heic', '.heif']
  private readonly HEIC_TYPES      = ['image/heic', 'image/heif']

  private isHeic(file: File): boolean {
    const name = file.name.toLowerCase()
    const isHeicExt  = this.HEIC_EXTENSIONS.some(ext => name.endsWith(ext))
    const isHeicType = this.HEIC_TYPES.includes(file.type)
    const hasNoType  = file.type === '' && isHeicExt  // iPhone sin mime type
    return isHeicExt || isHeicType || hasNoType
  }

  private async convertHeic(file: File): Promise<File> {
    const heic2any = (await import('heic2any')).default

    const converted = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 1, // sin pérdida aquí, la compresión la hace browser-image-compression
    })

    const blob = Array.isArray(converted) ? converted[0] : converted
    return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
  }

  async compress(file: File, onProgress?: (p: number) => void): Promise<File> {
    // 1. Convertir HEIC si es necesario
    const source = this.isHeic(file) ? await this.convertHeic(file) : file

    // 2. Comprimir con browser-image-compression
    const compressed = await imageCompression(source, {
      maxSizeMB:          0.5,
      maxWidthOrHeight:   800,
      useWebWorker:       true,
      fileType:           'image/webp',
      initialQuality:     0.6,
      alwaysKeepResolution: false,
      onProgress:         onProgress ?? (() => {}),
    })

    return new File(
      [compressed],
      file.name.replace(/\.\w+$/, '.webp'),
      { type: 'image/webp' }
    )
  }

  // Comprimir múltiples en paralelo
  async compressAll(files: File[], onProgress?: (p: number) => void): Promise<File[]> {
    return Promise.all(files.map(f => this.compress(f, onProgress)))
  }

  logStats(original: File, compressed: File): void {
    const originalKB   = (original.size   / 1024).toFixed(0)
    const compressedKB = (compressed.size / 1024).toFixed(0)
    const saved        = (((original.size - compressed.size) / original.size) * 100).toFixed(0)
    console.log(`📸 ${original.name}: ${originalKB}KB → ${compressedKB}KB (${saved}% reducido)`)
  }
}