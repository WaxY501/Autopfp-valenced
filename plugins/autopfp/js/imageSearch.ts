export type SearchImage = {
  title: string
  url: string
  originalUrl: string
}

export class AutoPfpImageSearch {
  private endpoint =
    'https://commons.wikimedia.org/w/api.php'

  async search(
    query: string,
    limit = 30
  ): Promise<SearchImage[]> {
    const cleaned = query.trim()
    if (!cleaned) return []

    const params = new URLSearchParams({
      action: 'query',
      generator: 'search',
      gsrsearch: cleaned,
      gsrnamespace: '6',
      gsrlimit: String(Math.min(Math.max(limit, 1), 50)),
      prop: 'imageinfo',
      iiprop: 'url',
      iiurlwidth: '512',
      format: 'json',
      origin: '*'
    })

    const response = await fetch(
      `${this.endpoint}?${params.toString()}`
    )

    if (!response.ok) {
      throw new Error(
        `Image search failed: HTTP ${response.status}`
      )
    }

    const data = await response.json()
    const pages = Object.values(
      data?.query?.pages ?? {}
    ) as any[]

    return pages
      .filter(page => page.imageinfo?.[0]?.thumburl)
      .map(page => ({
        title: page.title.replace(/^File:/, ''),
        url: page.imageinfo[0].thumburl,
        originalUrl: page.imageinfo[0].url
      }))
      .filter(image =>
        /\.(jpg|jpeg|png|webp)$/i.test(image.url)
      && !image.url.toLowerCase().includes('.svg')
      )
  }
}
