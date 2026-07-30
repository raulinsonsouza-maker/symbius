const SOCIAL_HOSTS = [
  'instagram.com',
  'facebook.com',
  'fb.com',
  'linkedin.com',
  'youtube.com',
  'youtu.be',
  'tiktok.com',
  'twitter.com',
  'x.com',
  'threads.net',
];

const MAX_HTML_BYTES = 1_500_000;
const MAX_TEXT_CHARS = 18_000;
const FETCH_TIMEOUT_MS = 20_000;

function normalizeUrl(raw) {
  let value = String(raw || '').trim();
  if (!value) throw Object.assign(new Error('URL do site é obrigatória'), { status: 400 });
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  let url;
  try {
    url = new URL(value);
  } catch {
    throw Object.assign(new Error('URL inválida'), { status: 400 });
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw Object.assign(new Error('URL deve ser http ou https'), { status: 400 });
  }
  return url.toString();
}

function decodeEntities(text) {
  return String(text || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function stripTags(html) {
  return decodeEntities(
    String(html || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

function metaContent(html, names) {
  for (const name of names) {
    const re = new RegExp(
      `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)["']`,
      'i',
    );
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${name}["']`,
      'i',
    );
    const m = html.match(re) || html.match(re2);
    if (m?.[1]) return decodeEntities(m[1]).trim();
  }
  return '';
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeEntities(m[1]).replace(/\s+/g, ' ').trim() : '';
}

function extractLinks(html, baseUrl) {
  const hrefs = [];
  const re = /<a[^>]+href=["']([^"']+)["']/gi;
  let match;
  while ((match = re.exec(html))) {
    hrefs.push(match[1]);
  }
  const abs = [];
  for (const href of hrefs) {
    try {
      abs.push(new URL(href, baseUrl).toString());
    } catch {
      /* ignore */
    }
  }
  return abs;
}

function detectSocialLinks(urls) {
  const found = {};
  for (const raw of urls) {
    let host;
    try {
      host = new URL(raw).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      continue;
    }
    for (const social of SOCIAL_HOSTS) {
      if (host === social || host.endsWith(`.${social}`)) {
        const key = social.replace('.com', '').replace('.net', '').replace('youtu.be', 'youtube');
        if (!found[key]) found[key] = raw.split('?')[0];
      }
    }
  }
  return found;
}

function guessClientName(title, ogSite, hostname) {
  const base = (ogSite || title || hostname || '')
    .split(/[|\-–—·:]/)[0]
    .replace(/\s+/g, ' ')
    .trim();
  return base.slice(0, 80);
}

export async function collectWebsite(websiteUrl) {
  const url = normalizeUrl(websiteUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; SymbiusAnalysisBot/1.0; +https://symbius.com.br)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
  } catch (err) {
    const msg =
      err.name === 'AbortError'
        ? 'Timeout ao acessar o site'
        : `Não foi possível acessar o site: ${err.message}`;
    throw Object.assign(new Error(msg), { status: 422 });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw Object.assign(
      new Error(`Site retornou HTTP ${res.status}`),
      { status: 422 },
    );
  }

  const buf = await res.arrayBuffer();
  const slice = buf.byteLength > MAX_HTML_BYTES ? buf.slice(0, MAX_HTML_BYTES) : buf;
  const html = new TextDecoder('utf-8', { fatal: false }).decode(slice);

  const title = extractTitle(html);
  const description =
    metaContent(html, ['description', 'og:description', 'twitter:description']) || '';
  const ogTitle = metaContent(html, ['og:title']) || '';
  const ogSite = metaContent(html, ['og:site_name']) || '';
  const finalUrl = res.url || url;
  const links = extractLinks(html, finalUrl);
  const socialLinks = detectSocialLinks(links);
  const text = stripTags(html).slice(0, MAX_TEXT_CHARS);
  let hostname = '';
  try {
    hostname = new URL(finalUrl).hostname.replace(/^www\./, '');
  } catch {
    hostname = '';
  }

  return {
    websiteUrl: finalUrl,
    requestedUrl: url,
    title,
    ogTitle,
    ogSite,
    description,
    hostname,
    suggestedClientName: guessClientName(title || ogTitle, ogSite, hostname),
    socialLinks,
    text,
    collectedAt: new Date().toISOString(),
  };
}

export { normalizeUrl };
