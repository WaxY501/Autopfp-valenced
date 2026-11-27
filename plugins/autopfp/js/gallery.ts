export type GalleryImage = {
  id: string
  name: string
  dataUrl: string
  addedAt: number
}

const DB_NAME = 'autopfp-gallery'
const DB_VERSION = 1
const STORE_NAME = 'images'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: 'id'
        })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export class AutoPfpGallery {
  async getAll(): Promise<GalleryImage[]> {
    const db = await openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        STORE_NAME,
        'readonly'
      )

      const request = transaction
        .objectStore(STORE_NAME)
        .getAll()

      request.onsuccess = () => {
        resolve(
          request.result.sort(
            (a, b) => b.addedAt - a.addedAt
          )
        )
      }

      request.onerror = () => reject(request.error)
    })
  }

  async addFromUrl(url: string): Promise<GalleryImage> {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error('Image download failed')
    }

    const blob = await response.blob()

    if (!blob.type.startsWith('image/')) {
      throw new Error('URL is not an image')
    }

    const dataUrl = await this.blobToDataUrl(blob)

    return this.save({
      id: crypto.randomUUID(),
      name: this.getName(url),
      dataUrl,
      addedAt: Date.now()
    })
  }

  async addFromFile(file: File): Promise<GalleryImage> {
    if (!file.type.startsWith('image/')) {
      throw new Error('File is not an image')
    }

    const dataUrl = await this.blobToDataUrl(file)

    return this.save({
      id: crypto.randomUUID(),
      name: file.name,
      dataUrl,
      addedAt: Date.now()
    })
  }

  async save(image: GalleryImage): Promise<GalleryImage> {
    const db = await openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        STORE_NAME,
        'readwrite'
      )

      transaction.objectStore(STORE_NAME).put(image)

      transaction.oncomplete = () => resolve(image)
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async remove(id: string): Promise<void> {
    const db = await openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        STORE_NAME,
        'readwrite'
      )

      transaction.objectStore(STORE_NAME).delete(id)

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async clear(): Promise<void> {
    const db = await openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        STORE_NAME,
        'readwrite'
      )

      transaction.objectStore(STORE_NAME).clear()

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async download(image: GalleryImage): Promise<void> {
    const link = document.createElement('a')

    link.href = image.dataUrl
    link.download = image.name || 'autopfp-image.png'
    link.click()
  }

  async processImage(
    image: GalleryImage,
    size = 512,
    quality = 0.92
  ): Promise<GalleryImage> {
    const img = await this.loadImage(image.dataUrl)

    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size

    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Canvas unavailable')
    }

    const scale = Math.max(
      size / img.width,
      size / img.height
    )

    const width = img.width * scale
    const height = img.height * scale

    const x = (size - width) / 2
    const y = (size - height) / 2

    ctx.drawImage(img, x, y, width, height)

    const processed = {
      ...image,
      dataUrl: canvas.toDataURL(
        'image/jpeg',
        Math.min(Math.max(quality, 0.1), 1)
      )
    }

    return this.save(processed)
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()

      img.onload = () => resolve(img)
      img.onerror = () => reject(
        new Error('Image processing failed')
      )

      img.src = src
    })
  }

  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = () => resolve(
        reader.result as string
      )

      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  }

  private getName(url: string): string {
    try {
      return decodeURIComponent(
        new URL(url).pathname.split('/').pop() || 'image'
      )
    } catch {
      return 'image'
    }
  }
}
