// Intelligent Full-Article Content Extractor for Bangladeshi & International News Portals
// Fetches 85% to 100% of original article body directly from the source

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lsquo;/g, '‘')
    .replace(/&rsquo;/g, '’')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&bull;/g, '•');
}

async function extractFullArticle(url, source = '') {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return null;
  // Skip YouTube video links
  if (url.includes('youtube.com') || url.includes('youtu.be')) return null;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'bn-BD,bn;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache'
      },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) return null;
    const html = await res.text();
    if (!html || html.length < 500) return null;

    // 1. Prothom Alo Specialized Selector (Quintype Story Elements)
    if (url.includes('prothomalo.com') || source.includes('প্রথম আলো')) {
      const storyDivs = [...html.matchAll(/<div[^>]*class="[^"]*story-element-text[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)];
      if (storyDivs.length > 0) {
        const paras = storyDivs
          .map(d => decodeHtmlEntities(d[1].replace(/<[^>]+>/g, '').trim()))
          .filter(t => t.length > 20);
        if (paras.length > 0) {
          return paras.join('\n\n');
        }
      }
    }

    // 2. Strip scripts, styles, iframes, svgs, header, footer, nav
    let sanitized = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '');

    // 3. Look for standard news body containers
    const bodyMatch = sanitized.match(/<(?:article|div|section)[^>]*(?:class|id)="[^"]*(?:story-content|news-details|detail-content|content-details|article-content|story-body|dtl_content_block|post-content|details-content|description|content_detail)[^"]*"[^>]*>([\s\S]*?)<\/(?:article|div|section)>/i)
                   || sanitized.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
                   || sanitized.match(/<main[^>]*>([\s\S]*?)<\/main>/i);

    const targetHtml = bodyMatch ? bodyMatch[1] : sanitized;

    // 4. Extract clean paragraphs
    const paragraphs = [...targetHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map(m => decodeHtmlEntities(m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()))
      .filter(t => {
        if (t.length < 35) return false;
        // Filter common boilerplates
        if (/^(লগইন|Login|সর্বশেষ|বিজ্ঞাপন|শেয়ার|Share|ছবি|ফাইল ছবি|Copyright|All rights reserved|document\.|window\.)/i.test(t)) return false;
        if (t.includes('Cloudflare') || t.includes('security service') || t.includes('function(') || t.includes('var ')) return false;
        return true;
      });

    if (paragraphs.length >= 2) {
      return paragraphs.join('\n\n');
    } else if (paragraphs.length === 1 && paragraphs[0].length > 150) {
      return paragraphs[0];
    }

    return null;
  } catch (err) {
    return null;
  }
}

module.exports = {
  extractFullArticle,
  decodeHtmlEntities
};
