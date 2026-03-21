export async function compressImage(file: File, maxWidth = 800, quality = 0.55): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      const scale  = Math.min(1, maxWidth / img.width)
      const width  = Math.floor(img.width * scale)
      const height = Math.floor(img.height * scale)

      const canvas = document.createElement('canvas')
      canvas.width  = width
      canvas.height = height

      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => resolve(new File([blob!], file.name.replace(/\.\w+$/, '.webp'), { type: 'image/webp' })),
        'image/webp',
        quality
      )
    }

    img.src = url
  })
}