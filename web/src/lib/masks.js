export function onlyDigits(value, max) {
  const digits = String(value || '').replace(/\D/g, '');
  return max != null ? digits.slice(0, max) : digits;
}

export function maskCpf(value) {
  const d = onlyDigits(value, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskCnpj(value) {
  const d = onlyDigits(value, 14);
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function maskDocument(value, type = 'cnpj') {
  return type === 'cpf' ? maskCpf(value) : maskCnpj(value);
}

/** Celular (11) ou fixo (10): (00) 00000-0000 / (00) 0000-0000 */
export function maskPhone(value) {
  const d = onlyDigits(value, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function maskCep(value) {
  const d = onlyDigits(value, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}
