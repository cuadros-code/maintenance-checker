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
    const hasNoType  = file.type === '' && isHeicExt
    return isHeicExt || isHeicType || hasNoType
  }

  private async convertHeic(file: File): Promise<File> {
    const heic2any = (await import('heic2any')).default
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 1 })
    const blob = Array.isArray(converted) ? converted[0] : converted
    return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
  }

  // Extrae ImageData dibujando en canvas
  private getImageData(file: File): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(url)
        const canvas  = document.createElement('canvas')
        canvas.width  = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        resolve(ctx.getImageData(0, 0, img.width, img.height))
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('No se pudo cargar la imagen'))
      }

      img.src = url
    })
  }

  // Convierte a WebP usando encoder WASM — funciona en cualquier dispositivo.
  // canvas.toBlob('image/webp') en iOS Safari < 16 produce PNG silenciosamente.
  private async forceWebP(file: File, quality: number): Promise<File> {
    const imageData              = await this.getImageData(file)
    const { default: encode }    = await import('@jsquash/webp/encode')
    const webpBytes              = await encode(imageData, { quality: Math.round(quality * 100) })
    return new File(
      [webpBytes],
      file.name.replace(/\.\w+$/, '.webp'),
      { type: 'image/webp' }
    )
  }

  async compress(file: File, onProgress?: (p: number) => void): Promise<File> {
    // 1. Convertir HEIC si es necesario
    const source = this.isHeic(file) ? await this.convertHeic(file) : file

    // 2. Reducir dimensiones y peso con browser-image-compression
    const resized = await imageCompression(source, {
      maxSizeMB:            0.7,
      maxWidthOrHeight:     800,
      useWebWorker:         true,
      alwaysKeepResolution: false,
      onProgress:           onProgress ?? (() => {}),
    })

    // 3. Forzar conversión a WebP via Canvas — aquí sí es garantizado
    const webp = await this.forceWebP(resized, 0.6)

    return webp
  }

  async compressAll(files: File[], onProgress?: (p: number) => void): Promise<File[]> {
    return Promise.all(files.map(f => this.compress(f, onProgress)))
  }

  logStats(original: File, compressed: File): void {
    const originalKB   = (original.size / 1024).toFixed(0)
    const compressedKB = (compressed.size / 1024).toFixed(0)
    const saved        = (((original.size - compressed.size) / original.size) * 100).toFixed(0)
    console.log(`📸 ${original.name}: ${originalKB}KB → ${compressedKB}KB (${saved}% reducido)`)
  }
}