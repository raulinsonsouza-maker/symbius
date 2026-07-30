/**
 * Gera slug público legível a partir do nome do cliente + sufixo aleatório.
 * Usado na criação da análise estratégica.
 */
export function buildAnalysisSlug(clientName, randomSuffix) {
  const base = String(clientName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const suffix = String(randomSuffix || '').slice(0, 10);
  return base ? `${base}-${suffix}` : suffix;
}
