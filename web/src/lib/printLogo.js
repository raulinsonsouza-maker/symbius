/** Logos claros → versão preta para fundos claros (PDF / folha). */
export function resolvePrintLogo(logoUrl) {
  const fallback = '/images/logotipo-preto.png';
  if (!logoUrl) return fallback;
  if (/branco|white|claro/i.test(logoUrl)) {
    return logoUrl
      .replace(/branco/gi, 'preto')
      .replace(/white/gi, 'black')
      .replace(/claro/gi, 'preto');
  }
  return logoUrl;
}
