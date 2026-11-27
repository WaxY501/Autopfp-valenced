export type GalleryImage = {
  id: string
  name: string
  dataUrl: string
  addedAt: number
}

const DB_NAME = 'autopfp-gallery'
const DB_VERSION = 2
const STORE_NAME = 'images'
const COLLECTION_STORE = 'collections'

export type SavedCollection = { id: string; name: string; imageIds: string[]; updatedAt: number }

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(COLLECTION_STORE)) {
        db.createObjectStore(COLLECTION_STORE, { keyPath: 'id' })
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

    async getCollections(): Promise<SavedCollection[]> {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(COLLECTION_STORE, 'readonly')
      const req = tx.objectStore(COLLECTION_STORE).getAll()
      req.onsuccess = () => resolve((req.result as SavedCollection[]).sort((a, b) => b.updatedAt - a.updatedAt))
      req.onerror = () => reject(req.error)
    })
  }

  async saveCollection(name: string, imageIds: string[], id?: string): Promise<SavedCollection> {
    const cleanName = name.trim()
    if (!cleanName || imageIds.length === 0) throw new Error('Collection name and at least one image are required')
    const collection: SavedCollection = { id: id || crypto.randomUUID(), name: cleanName, imageIds: [...imageIds], updatedAt: Date.now() }
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(COLLECTION_STORE, 'readwrite')
      tx.objectStore(COLLECTION_STORE).put(collection)
      tx.oncomplete = () => resolve(collection)
      tx.onerror = () => reject(tx.error)
    })
  }

  async removeCollection(id: string): Promise<void> {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(COLLECTION_STORE, 'readwrite')
      tx.objectStore(COLLECTION_STORE).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async pickFilesFromDevice(): Promise<GalleryImage[]> {
    if (typeof document === 'undefined') throw new Error('Device file picker is not available in this runtime')
    return new Promise((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.multiple = true
      input.onchange = async () => {
        try {
          const files = Array.from(input.files || [])
          const added = await Promise.all(files.map(file => this.addFromFile(file)))
          resolve(added)
        } catch (error) { reject(error) }
      }
      input.click()
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
    quality = 0.92,
    mode: 'cover' | 'contain' = 'cover'
  ): Promise<GalleryImage> {
    const img = await this.loadImage(image.dataUrl)

    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size

    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Canvas unavailable')
    }

    const scale = mode === 'cover'
      ? Math.max(size / img.width, size / img.height)
      : Math.min(size / img.width, size / img.height)

    const width = img.width * scale
    const height = img.height * scale

    const x = (size - width) / 2
    const y = (size - height) / 2

    if (mode === 'cover') {
      ctx.drawImage(img, x, y, width, height)
    } else {
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, x, y, width, height)
    }

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
