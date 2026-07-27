export const ASAAS_BILLING_OPTIONS = [
  { value: 'PIX', label: 'Pix' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'CREDIT_CARD', label: 'Cartão de crédito' },
  { value: 'UNDEFINED', label: 'Cliente escolhe na fatura' },
];

export function billingTypeLabel(value) {
  return (
    ASAAS_BILLING_OPTIONS.find((o) => o.value === value)?.label ||
    value ||
    '—'
  );
}

/** Converte dd/mm/yyyy ↔ yyyy-mm-dd para input type="date" */
export function toDateInputValue(brOrIso) {
  if (!brOrIso) return '';
  const s = String(brOrIso).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    return `${br[3]}-${String(br[2]).padStart(2, '0')}-${String(br[1]).padStart(2, '0')}`;
  }
  return '';
}

export function fromDateInputValue(iso) {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function BillingTypeSelect({ value, onChange, id }) {
  return (
    <select
      id={id}
      value={value || 'UNDEFINED'}
      onChange={(e) => onChange(e.target.value)}
    >
      {ASAAS_BILLING_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
