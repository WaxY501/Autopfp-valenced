export type PfpImage = {
  url: string
  addedAt: number
}

export class AutoPfpCore {
  private images: PfpImage[] = []
  private currentUrl: string | null = null
  private timer: ReturnType<typeof setInterval> | null = null

  addImage(url: string): boolean {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:') return false
    } catch {
      return false
    }

    if (this.images.some(img => img.url === url)) return false

    this.images.push({
      url,
      addedAt: Date.now()
    })

    return true
  }

  removeImage(url: string): boolean {
    const oldLength = this.images.length
    this.images = this.images.filter(img => img.url !== url)
    return this.images.length !== oldLength
  }

  getImages(): PfpImage[] {
    return [...this.images]
  }

  getRandomImage(): PfpImage | null {
    if (this.images.length === 0) return null

    const available = this.images.filter(
      img => img.url !== this.currentUrl
    )

    const pool = available.length > 0 ? available : this.images
    const selected = pool[Math.floor(Math.random() * pool.length)]

    this.currentUrl = selected.url
    return selected
  }

  startRotation(
    intervalMs: number,
    onChange: (image: PfpImage) => void
  ): boolean {
    this.stopRotation()

    if (this.images.length < 2) return false

    const safeInterval = Math.max(10_000, intervalMs)

    this.timer = setInterval(() => {
      const image = this.getRandomImage()
      if (image) onChange(image)
    }, safeInterval)

    return true
  }

  stopRotation(): void {
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  get size(): number {
    return this.images.length
  }

  get isRotating(): boolean {
    return this.timer !== null
  }
}
