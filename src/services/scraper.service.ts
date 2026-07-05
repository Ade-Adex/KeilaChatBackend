// /src/services/scraper.service.ts

import axios from 'axios'
import * as cheerio from 'cheerio'

interface ScrapedPageResult {
  title: string
  rawContent: string
  success: boolean
}

/**
 * Fetches a target URL and extracts clean, structural text content
 */
export async function scrapeWebpage(url: string): Promise<ScrapedPageResult> {
  try {
    // 1. Fetch HTML markup with a standard browser User-Agent header
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
      timeout: 10000, // 10 second safety threshold
    })

    const $ = cheerio.load(html)

    // 2. Clutter Eviction: Strip out non-informational structural nodes
    $(
      'nav, footer, script, style, noscript, iframe, header, svg, .sidebar, #menu, .footer, .navbar',
    ).remove()

    // 3. Extract Document Title
    const title = $('title').text().trim() || 'Untitled Source Page'

    // 4. Content Gathering: Extract structural readable elements
    const textBlocks: string[] = []

    $('h1, h2, h3, h4, h5, h6, p, li, table').each((_, element) => {
      const cleanText = $(element).text().replace(/\s+/g, ' ').trim()
      if (cleanText.length > 5) {
        textBlocks.push(cleanText)
      }
    })

    // 5. Combine extracted items with clean line breaks
    const rawContent = textBlocks.join('\n')

    if (!rawContent) {
      throw new Error(
        'No readable text content extracted from page structural layers.',
      )
    }

    return {
      title,
      rawContent,
      success: true,
    }
  } catch (error: any) {
    console.error(
      `[Scraper Service] Failed crawling target context [${url}]:`,
      error.message,
    )
    return {
      title: '',
      rawContent: `Failed indexing content: ${error.message}`,
      success: false,
    }
  }
}