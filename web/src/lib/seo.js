export const SITE_URL = 'https://symbius.com.br';
export const SITE_NAME = 'Symbius';
export const DEFAULT_TITLE = 'Symbius | Máquina de captação de clientes';
export const DEFAULT_DESCRIPTION =
  'Pare de depender de campanhas soltas. A Symbius constrói uma máquina de clientes com BrandGrowth: marca forte, tráfego, CRM e conversão em um sistema previsível.';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/logotipo-branco.png`;

function ensureMeta(selector, attrs) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    Object.entries(attrs.create || {}).forEach(([k, v]) => el.setAttribute(k, v));
    document.head.appendChild(el);
  }
  if (attrs.content != null) el.setAttribute('content', attrs.content);
  return el;
}

function ensureLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
  return el;
}

function setJsonLd(id, data) {
  const scriptId = `seo-jsonld-${id}`;
  let el = document.getElementById(scriptId);
  if (!data) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = scriptId;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/**
 * Atualiza title/meta/canonical/OG no <head> (SPA).
 * Páginas privadas devem passar noindex: true.
 */
export function applySeo({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  image = DEFAULT_OG_IMAGE,
  noindex = false,
  type = 'website',
  jsonLd = null,
} = {}) {
  const url = path.startsWith('http')
    ? path
    : `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

  document.title = fullTitle;

  ensureMeta('meta[name="description"]', {
    create: { name: 'description' },
    content: description,
  });
  ensureMeta('meta[name="robots"]', {
    create: { name: 'robots' },
    content: noindex
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  });
  ensureMeta('meta[name="googlebot"]', {
    create: { name: 'googlebot' },
    content: noindex ? 'noindex, nofollow' : 'index, follow',
  });

  ensureLink('canonical', noindex ? SITE_URL + '/' : url);

  ensureMeta('meta[property="og:type"]', {
    create: { property: 'og:type' },
    content: type,
  });
  ensureMeta('meta[property="og:site_name"]', {
    create: { property: 'og:site_name' },
    content: SITE_NAME,
  });
  ensureMeta('meta[property="og:url"]', {
    create: { property: 'og:url' },
    content: url,
  });
  ensureMeta('meta[property="og:title"]', {
    create: { property: 'og:title' },
    content: fullTitle,
  });
  ensureMeta('meta[property="og:description"]', {
    create: { property: 'og:description' },
    content: description,
  });
  ensureMeta('meta[property="og:image"]', {
    create: { property: 'og:image' },
    content: image.startsWith('http') ? image : `${SITE_URL}${image}`,
  });
  ensureMeta('meta[property="og:locale"]', {
    create: { property: 'og:locale' },
    content: 'pt_BR',
  });

  ensureMeta('meta[name="twitter:card"]', {
    create: { name: 'twitter:card' },
    content: 'summary_large_image',
  });
  ensureMeta('meta[name="twitter:title"]', {
    create: { name: 'twitter:title' },
    content: fullTitle,
  });
  ensureMeta('meta[name="twitter:description"]', {
    create: { name: 'twitter:description' },
    content: description,
  });
  ensureMeta('meta[name="twitter:image"]', {
    create: { name: 'twitter:image' },
    content: image.startsWith('http') ? image : `${SITE_URL}${image}`,
  });

  setJsonLd('page', jsonLd);
}

export function clearPageJsonLd() {
  setJsonLd('page', null);
}
