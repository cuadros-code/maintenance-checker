import { Injectable } from '@angular/core'
import imageCompression from 'browser-image-compression'

@Injectable({ providedIn: 'root' })
export class ImageCompressService {

  private readonly HEIC_EXTENSIONS = ['.heic', '.heif']
  private readonly HEIC_TYPES      = ['image/heic', 'image/heif']

  private isHeic(file: File): boolean {
    const name = file.name.toLowerCase()
    return this.HEIC_EXTENSIONS.some(ext => name.endsWith(ext))
      || this.HEIC_TYPES.includes(file.type)
      || (file.type === '' && this.HEIC_EXTENSIONS.some(ext => name.endsWith(ext)))
  }

  private async convertHeic(file: File): Promise<File> {
    const heic2any = (await import('heic2any')).default
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 1 })
    const blob = Array.isArray(converted) ? converted[0] : converted
    return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
  }

  private getImageData(file: File): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const canvas  = document.createElement('canvas')
        canvas.width  = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        resolve(ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight))
      }
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load failed')) }
      img.src = url
    })
  }

  private async toWebP(file: File, quality: number): Promise<File> {
    const imageData = await this.getImageData(file)

    try {
      const { default: encode } = await import('@jsquash/webp/encode')
      const bytes = await encode(imageData, { quality: Math.round(quality * 100) })
      return new File([bytes], file.name.replace(/\.\w+$/, '.webp'), { type: 'image/webp' })
    } catch {
    }

    const canvas  = document.createElement('canvas')
    canvas.width  = imageData.width
    canvas.height = imageData.height
    canvas.getContext('2d')!.putImageData(imageData, 0, 0)

    const tryBlob = (mime: string): Promise<Blob | null> =>
      new Promise(res => canvas.toBlob(res, mime, quality))

    const webpBlob = await tryBlob('image/webp')
    if (webpBlob?.type === 'image/webp') {
      return new File([webpBlob], file.name.replace(/\.\w+$/, '.webp'), { type: 'image/webp' })
    }

    // 3. JPEG — soporte universal, siempre comprime
    const jpegBlob = await tryBlob('image/jpeg')
    if (!jpegBlob) throw new Error('No se pudo encodear la imagen')
    return new File([jpegBlob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
  }

  async compress(file: File, onProgress?: (p: number) => void): Promise<File> {
    let source = file
    if (this.isHeic(file)) {
      try { source = await this.convertHeic(file) } catch { /* mantener original */ }
    }

    let resized = source
    try {
      resized = await imageCompression(source, {
        maxSizeMB:            0.8,
        maxWidthOrHeight:     1920,
        useWebWorker:         true,
        alwaysKeepResolution: false,
        onProgress:           onProgress ?? (() => {}),
      })
    } catch {
      // imageCompression falló — continuar con source para al menos convertir formato
    }

    try {
      return await this.toWebP(resized, 0.75)
    } catch {
      return resized
    }
  }

  async compressAll(files: File[], onProgress?: (p: number) => void): Promise<File[]> {
    return Promise.all(files.map(f => this.compress(f, onProgress)))
  }

  logStats(original: File, compressed: File): void {
    const originalKB   = (original.size / 1024).toFixed(0)
    const compressedKB = (compressed.size / 1024).toFixed(0)
    const saved        = (((original.size - compressed.size) / original.size) * 100).toFixed(0)
    console.log(`📸 ${original.name} → ${compressed.name}: ${originalKB}KB → ${compressedKB}KB (${saved}% reducido) [${compressed.type}]`)
  }
}
