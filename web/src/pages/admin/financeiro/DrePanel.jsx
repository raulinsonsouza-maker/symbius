import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../lib/api';
import { formatCurrency } from '../../../data/proposalTemplates';

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(yearMonth, delta) {
  const [y, m] = String(yearMonth).split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(yearMonth) {
  const [y, m] = String(yearMonth).split('-').map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function monthHeader(yearMonth) {
  const [y, m] = String(yearMonth).split('-').map(Number);
  return new Date(y, m - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'short' })
    .replace('.', '');
}

function pctLabel(rate) {
  return `${Math.round((Number(rate) || 0) * 1000) / 10}%`;
}

function moneyClass(n, { invert = false } = {}) {
  const v = Number(n) || 0;
  if (v === 0) return 'fin-dre__val--muted';
  const positive = invert ? v < 0 : v > 0;
  return positive ? 'fin-dre__val--pos' : 'fin-dre__val--neg';
}

function buildMonthOptions() {
  const now = currentMonth();
  const options = [];
  for (let i = -17; i <= 1; i += 1) {
    const value = shiftMonth(now, i);
    options.push({ value, label: monthLabel(value) });
  }
  return options;
}

const ANNUAL_ROWS = [
  { key: 'receitaBruta', label: 'Receita bruta', invert: false },
  { key: 'impostosTaxas', label: 'Impostos e taxas', invert: true },
  { key: 'ferramentas', label: 'Despesas operacionais', invert: true },
  { key: 'prolabore', label: 'Pró-labore', invert: true },
  { key: 'lucroLiquido', label: 'Lucro líquido', invert: false },
  { key: 'reservas', label: 'Reservas', invert: true },
  { key: 'caixaLivre', label: 'Caixa livre', invert: false },
];

export default function DrePanel({ onOpenAsaas }) {
  const [view, setView] = useState('monthly'); // monthly | annual
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(() => Number(currentMonth().slice(0, 4)));
  const [dre, setDre] = useState(null);
  const [annual, setAnnual] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const [simplesRate, setSimplesRate] = useState(6);
  const [rMkt, setRMkt] = useState(10);
  const [rWork, setRWork] = useState(15);
  const [rExp, setRExp] = useState(5);
  const [periodStartDay, setPeriodStartDay] = useState(1);
  const [tools, setTools] = useState([]);
  const [prolabore, setProlabore] = useState([]);
  const [asaasFeesOverride, setAsaasFeesOverride] = useState('');

  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [2026, y, y + 1].filter((n, i, arr) => arr.indexOf(n) === i).sort();
  }, []);

  async function loadMonthly(m = month) {
    setLoading(true);
    setError('');
    try {
      const data = await api.getFinanceDre({ month: m });
      setDre(data);
      const s = data.settings || {};
      setSimplesRate(Math.round((Number(s.simplesRate) || 0) * 10000) / 100);
      setRMkt(Math.round((Number(s.reserveMarketingRate) || 0) * 10000) / 100);
      setRWork(Math.round((Number(s.reserveWorkingRate) || 0) * 10000) / 100);
      setRExp(Math.round((Number(s.reserveExpansionRate) || 0) * 10000) / 100);
      setPeriodStartDay(Number(s.periodStartDay) || 1);
      setTools(
        (data.recurring || [])
          .filter((r) => r.section === 'tools')
          .map((r) => ({ ...r })),
      );
      setProlabore(
        (data.recurring || [])
          .filter((r) => r.section === 'prolabore')
          .map((r) => ({ ...r })),
      );
      const ov = data.overrides || {};
      setAsaasFeesOverride(
        ov.asaasFeesTotal != null && ov.asaasFeesTotal !== ''
          ? String(ov.asaasFeesTotal)
          : '',
      );
    } catch (err) {
      setError(err.message || 'Falha ao carregar DRE');
      setDre(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadAnnual(y = year) {
    setLoading(true);
    setError('');
    try {
      const data = await api.getFinanceDreAnnual({ year: y });
      setAnnual(data);
    } catch (err) {
      setError(err.message || 'Falha ao carregar DRE anual');
      setAnnual(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (view === 'annual') loadAnnual(year);
    else loadMonthly(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, month, year]);

  const preview = useMemo(() => {
    if (!dre) return null;
    const receitaBruta = Number(dre.receitaBruta) || 0;
    const simples = Math.round(receitaBruta * (simplesRate / 100) * 100) / 100;
    const taxasAsaas =
      asaasFeesOverride !== ''
        ? Number(asaasFeesOverride) || 0
        : Number(dre.taxes?.asaasFees?.amount) || 0;
    const extraTaxes = Number(dre.taxes?.extraTaxes) || 0;
    const impostos = Math.round((simples + taxasAsaas + extraTaxes) * 100) / 100;
    const ferramentas = tools.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const pl = prolabore.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const resultadoOp =
      Math.round((receitaBruta - impostos - ferramentas) * 100) / 100;
    const lucro = Math.round((resultadoOp - pl) * 100) / 100;
    const reserves = [
      {
        name: `Marketing (${pctLabel(rMkt / 100)})`,
        amount: Math.round(receitaBruta * (rMkt / 100) * 100) / 100,
      },
      {
        name: `Capital de Giro (${pctLabel(rWork / 100)})`,
        amount: Math.round(receitaBruta * (rWork / 100) * 100) / 100,
      },
      {
        name: `Expansão (${pctLabel(rExp / 100)})`,
        amount: Math.round(receitaBruta * (rExp / 100) * 100) / 100,
      },
    ];
    const totalReservas = reserves.reduce((s, r) => s + r.amount, 0);
    const caixaLivre = Math.round((lucro - totalReservas) * 100) / 100;
    return {
      receitaBruta,
      simples,
      taxasAsaas,
      impostos,
      ferramentas,
      resultadoOp,
      pl,
      lucro,
      reserves,
      totalReservas,
      caixaLivre,
    };
  }, [dre, simplesRate, rMkt, rWork, rExp, tools, prolabore, asaasFeesOverride]);

  function updateLine(section, index, patch) {
    const setter = section === 'tools' ? setTools : setProlabore;
    setter((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function addLine(section) {
    const row = {
      id: `new-${Date.now()}`,
      section,
      name: section === 'tools' ? 'Nova despesa' : 'Novo sócio',
      amount: 0,
      active: true,
    };
    if (section === 'tools') setTools((p) => [...p, row]);
    else setProlabore((p) => [...p, row]);
  }

  function removeLine(section, index) {
    if (section === 'tools') setTools((p) => p.filter((_, i) => i !== index));
    else setProlabore((p) => p.filter((_, i) => i !== index));
  }

  function openMonth(m) {
    setMonth(m);
    setView('monthly');
  }

  async function saveAll() {
    setSaving(true);
    setError('');
    setOk('');
    try {
      await api.updateFinanceDreSettings({
        simplesRate: simplesRate / 100,
        reserveMarketingRate: rMkt / 100,
        reserveWorkingRate: rWork / 100,
        reserveExpansionRate: rExp / 100,
        periodStartDay,
      });
      await api.updateFinanceDreRecurring({
        items: [...tools, ...prolabore].map((r, i) => ({
          id: String(r.id || '').startsWith('new-') ? undefined : r.id,
          section: r.section,
          name: r.name,
          amount: Number(r.amount) || 0,
          active: true,
          sortOrder: (i + 1) * 10,
        })),
      });
      if (asaasFeesOverride !== '') {
        await api.updateFinanceDreMonthOverride(month, {
          payload: { asaasFeesTotal: Number(asaasFeesOverride) || 0 },
        });
      }
      setOk('DRE salvo.');
      await loadMonthly(month);
    } catch (err) {
      setError(err.message || 'Falha ao salvar DRE');
    } finally {
      setSaving(false);
    }
  }

  if (loading && ((view === 'monthly' && !dre) || (view === 'annual' && !annual))) {
    return <p className="prop-muted">Carregando DRE…</p>;
  }

  const kpiSource =
    view === 'annual'
      ? annual?.totals
      : preview
        ? {
            receitaBruta: preview.receitaBruta,
            impostosTaxas: preview.impostos,
            ferramentas: preview.ferramentas,
            prolabore: preview.pl,
            lucroLiquido: preview.lucro,
            reservas: preview.totalReservas,
            caixaLivre: preview.caixaLivre,
          }
        : null;

  return (
    <div className="fin-dre">
      <section className="fin-dre__hero">
        <div className="fin-dre__hero-main">
          <div className="fin-dre__mode">
            <button
              type="button"
              className={`fin-dre__mode-btn ${view === 'monthly' ? 'is-active' : ''}`}
              onClick={() => setView('monthly')}
            >
              Mensal
            </button>
            <button
              type="button"
              className={`fin-dre__mode-btn ${view === 'annual' ? 'is-active' : ''}`}
              onClick={() => setView('annual')}
            >
              Anual
            </button>
          </div>

          {view === 'monthly' ? (
            <div className="fin-dre__period-nav">
              <button
                type="button"
                className="fin-dre__nav-btn"
                onClick={() => setMonth((m) => shiftMonth(m, -1))}
                aria-label="Mês anterior"
              >
                ‹
              </button>
              <div className="fin-dre__period-copy">
                <span className="fin-dre__eyebrow">Período do DRE</span>
                <label className="fin-dre__month-select">
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    aria-label="Selecionar mês"
                  >
                    {!monthOptions.some((o) => o.value === month) ? (
                      <option value={month}>{monthLabel(month)}</option>
                    ) : null}
                    {monthOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <small>{dre?.period?.label || '—'}</small>
              </div>
              <button
                type="button"
                className="fin-dre__nav-btn"
                onClick={() => setMonth((m) => shiftMonth(m, 1))}
                aria-label="Próximo mês"
              >
                ›
              </button>
            </div>
          ) : (
            <div className="fin-dre__period-nav">
              <div className="fin-dre__period-copy">
                <span className="fin-dre__eyebrow">DRE anual</span>
                <label className="fin-dre__month-select">
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    aria-label="Selecionar ano"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </label>
                <small>
                  {annual?.fromMonth && annual?.toMonth
                    ? `${monthLabel(annual.fromMonth)} → ${monthLabel(annual.toMonth)}`
                    : year === 2026
                      ? 'Agosto → Dezembro'
                      : 'Janeiro → Dezembro'}
                </small>
              </div>
            </div>
          )}
        </div>

        <div className="fin-dre__hero-side">
          {view === 'monthly' ? (
            <>
              <label className="fin-dre__day">
                <span>Início mês comercial</span>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={periodStartDay}
                  onChange={(e) => setPeriodStartDay(Number(e.target.value) || 1)}
                />
              </label>
              <div className="fin-dre__hero-actions">
                <button
                  type="button"
                  className="lp-btn lp-btn--solid lp-btn--sm"
                  onClick={saveAll}
                  disabled={saving}
                >
                  {saving ? 'Salvando…' : 'Salvar estrutura'}
                </button>
                {typeof onOpenAsaas === 'function' ? (
                  <button
                    type="button"
                    className="lp-btn lp-btn--ghost lp-btn--sm"
                    onClick={onOpenAsaas}
                  >
                    Ver cobranças Asaas
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <div className="fin-dre__hero-actions">
              {typeof onOpenAsaas === 'function' ? (
                <button
                  type="button"
                  className="lp-btn lp-btn--ghost lp-btn--sm"
                  onClick={onOpenAsaas}
                >
                  Ver cobranças Asaas
                </button>
              ) : null}
            </div>
          )}
        </div>
      </section>

      {kpiSource ? (
        <div className="fin-dre__kpis">
          <div className="fin-dre__kpi fin-dre__kpi--income">
            <span>Receita bruta</span>
            <strong>{formatCurrency(kpiSource.receitaBruta)}</strong>
            <small>{view === 'annual' ? `Ano ${year}` : `${(dre?.revenues || []).length} cobrança(s)`}</small>
          </div>
          <div className="fin-dre__kpi fin-dre__kpi--tax">
            <span>Impostos e taxas</span>
            <strong>{formatCurrency(kpiSource.impostosTaxas)}</strong>
            <small>{view === 'annual' ? 'Soma do período' : `Simples ${pctLabel(simplesRate / 100)}`}</small>
          </div>
          <div className="fin-dre__kpi fin-dre__kpi--cost">
            <span>Custos fixos</span>
            <strong>
              {formatCurrency(
                (Number(kpiSource.ferramentas) || 0) + (Number(kpiSource.prolabore) || 0),
              )}
            </strong>
            <small>Despesas + pró-labore</small>
          </div>
          <div className="fin-dre__kpi fin-dre__kpi--profit">
            <span>Lucro líquido</span>
            <strong className={moneyClass(kpiSource.lucroLiquido)}>
              {formatCurrency(kpiSource.lucroLiquido)}
            </strong>
            <small>Após custos</small>
          </div>
          <div className="fin-dre__kpi fin-dre__kpi--cash">
            <span>Caixa livre</span>
            <strong className={moneyClass(kpiSource.caixaLivre)}>
              {formatCurrency(kpiSource.caixaLivre)}
            </strong>
            <small>Após reservas</small>
          </div>
        </div>
      ) : null}

      {error ? <p className="prop-error">{error}</p> : null}
      {ok ? <p className="prop-ok">{ok}</p> : null}

      {view === 'annual' ? (
        !annual ? (
          <p className="prop-error">Não foi possível montar o DRE anual.</p>
        ) : (
          <div className="fin-dre__annual-wrap">
            <table className="fin-dre__annual">
              <thead>
                <tr>
                  <th>Linha</th>
                  {annual.items.map((item) => (
                    <th key={item.month}>
                      <button
                        type="button"
                        className="fin-dre__annual-month"
                        onClick={() => openMonth(item.month)}
                        title={`Abrir DRE de ${monthLabel(item.month)}`}
                      >
                        {monthHeader(item.month)}
                      </button>
                    </th>
                  ))}
                  <th className="fin-dre__annual-total">Total</th>
                </tr>
              </thead>
              <tbody>
                {ANNUAL_ROWS.map((row) => (
                  <tr
                    key={row.key}
                    className={
                      row.key === 'caixaLivre'
                        ? 'fin-dre__annual-row--cash'
                        : row.key === 'lucroLiquido'
                          ? 'fin-dre__annual-row--profit'
                          : undefined
                    }
                  >
                    <td>{row.label}</td>
                    {annual.items.map((item) => {
                      const value = Number(item.summary?.[row.key]) || 0;
                      return (
                        <td
                          key={item.month}
                          className={`fin-dre__val ${moneyClass(value, { invert: row.invert })}`}
                        >
                          {formatCurrency(value)}
                        </td>
                      );
                    })}
                    <td
                      className={`fin-dre__val fin-dre__annual-total ${moneyClass(
                        annual.totals?.[row.key],
                        { invert: row.invert },
                      )}`}
                    >
                      {formatCurrency(annual.totals?.[row.key])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="fin-dre__annual-hint prop-muted">
              Clique no mês para abrir o DRE mensal detalhado.
            </p>
          </div>
        )
      ) : !dre || !preview ? (
        <p className="prop-error">{error || 'Não foi possível montar o DRE.'}</p>
      ) : (
        <>
          {!dre.asaasConfigured ? (
            <p className="prop-muted">
              Asaas não configurado — receitas do período ficam zeradas até definir
              ASAAS_API_KEY.
            </p>
          ) : null}

          <div className="fin-dre__layout">
            <div className="fin-dre__table-wrap">
              <table className="fin-dre__table">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Descrição</th>
                    <th>Valor (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="fin-dre__section fin-dre__section--income">
                    <td>Receitas</td>
                    <td colSpan={2} />
                  </tr>
                  {(dre.revenues || []).length === 0 ? (
                    <tr>
                      <td />
                      <td className="prop-muted">
                        Nenhuma cobrança recebida no período
                      </td>
                      <td className="fin-dre__val fin-dre__val--muted">0,00</td>
                    </tr>
                  ) : (
                    dre.revenues.map((r) => (
                      <tr key={r.id} className="fin-dre__row--income">
                        <td />
                        <td>{r.description}</td>
                        <td className={`fin-dre__val ${moneyClass(r.value)}`}>
                          {formatCurrency(r.value)}
                        </td>
                      </tr>
                    ))
                  )}
                  <tr className="fin-dre__total fin-dre__total--income">
                    <td />
                    <td>Receita Bruta</td>
                    <td className={`fin-dre__val ${moneyClass(preview.receitaBruta)}`}>
                      {formatCurrency(preview.receitaBruta)}
                    </td>
                  </tr>

                  <tr className="fin-dre__section fin-dre__section--tax">
                    <td>(-) Impostos e taxas</td>
                    <td colSpan={2} />
                  </tr>
                  <tr className="fin-dre__row--tax">
                    <td />
                    <td>
                      Simples Nacional (
                      <input
                        className="fin-dre__pct"
                        type="number"
                        step="0.1"
                        value={simplesRate}
                        onChange={(e) => setSimplesRate(Number(e.target.value) || 0)}
                      />
                      %)
                    </td>
                    <td className={`fin-dre__val ${moneyClass(preview.simples, { invert: true })}`}>
                      {formatCurrency(preview.simples)}
                    </td>
                  </tr>
                  <tr className="fin-dre__row--tax">
                    <td />
                    <td>
                      Asaas – taxas
                      <input
                        className="fin-dre__inline-num"
                        type="number"
                        step="0.01"
                        placeholder={String(dre.taxes?.asaasFees?.amount ?? 0)}
                        value={asaasFeesOverride}
                        onChange={(e) => setAsaasFeesOverride(e.target.value)}
                        title="Deixe vazio para usar cálculo automático"
                      />
                    </td>
                    <td className={`fin-dre__val ${moneyClass(preview.taxasAsaas, { invert: true })}`}>
                      {formatCurrency(preview.taxasAsaas)}
                    </td>
                  </tr>
                  <tr className="fin-dre__total fin-dre__total--tax">
                    <td />
                    <td>Total Impostos e Taxas</td>
                    <td className={`fin-dre__val ${moneyClass(preview.impostos, { invert: true })}`}>
                      {formatCurrency(preview.impostos)}
                    </td>
                  </tr>

                  <tr className="fin-dre__section fin-dre__section--cost">
                    <td>(-) Despesas operacionais</td>
                    <td colSpan={2}>
                      <button
                        type="button"
                        className="fin-dre__add"
                        onClick={() => addLine('tools')}
                      >
                        + Item
                      </button>
                    </td>
                  </tr>
                  {tools.map((row, index) => (
                    <tr key={row.id || index} className="fin-dre__row--cost">
                      <td />
                      <td className="fin-dre__edit-row">
                        <input
                          value={row.name}
                          onChange={(e) =>
                            updateLine('tools', index, { name: e.target.value })
                          }
                        />
                        <button
                          type="button"
                          className="fin-dre__remove"
                          onClick={() => removeLine('tools', index)}
                        >
                          Remover
                        </button>
                      </td>
                      <td className="fin-dre__val">
                        <input
                          className="fin-dre__amount"
                          type="number"
                          step="0.01"
                          value={row.amount}
                          onChange={(e) =>
                            updateLine('tools', index, {
                              amount: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                  <tr className="fin-dre__total fin-dre__total--cost">
                    <td />
                    <td>Total despesas operacionais</td>
                    <td className={`fin-dre__val ${moneyClass(preview.ferramentas, { invert: true })}`}>
                      {formatCurrency(preview.ferramentas)}
                    </td>
                  </tr>

                  <tr className="fin-dre__result fin-dre__result--op">
                    <td>Resultado operacional</td>
                    <td>Receita após impostos e despesas</td>
                    <td className={`fin-dre__val ${moneyClass(preview.resultadoOp)}`}>
                      {formatCurrency(preview.resultadoOp)}
                    </td>
                  </tr>

                  <tr className="fin-dre__section fin-dre__section--payroll">
                    <td>Pró-labore</td>
                    <td colSpan={2}>
                      <button
                        type="button"
                        className="fin-dre__add"
                        onClick={() => addLine('prolabore')}
                      >
                        + Item
                      </button>
                    </td>
                  </tr>
                  {prolabore.map((row, index) => (
                    <tr key={row.id || index} className="fin-dre__row--payroll">
                      <td />
                      <td className="fin-dre__edit-row">
                        <input
                          value={row.name}
                          onChange={(e) =>
                            updateLine('prolabore', index, { name: e.target.value })
                          }
                        />
                        <button
                          type="button"
                          className="fin-dre__remove"
                          onClick={() => removeLine('prolabore', index)}
                        >
                          Remover
                        </button>
                      </td>
                      <td className="fin-dre__val">
                        <input
                          className="fin-dre__amount"
                          type="number"
                          step="0.01"
                          value={row.amount}
                          onChange={(e) =>
                            updateLine('prolabore', index, {
                              amount: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                  <tr className="fin-dre__total fin-dre__total--payroll">
                    <td />
                    <td>Total Pró-labore</td>
                    <td className={`fin-dre__val ${moneyClass(preview.pl, { invert: true })}`}>
                      {formatCurrency(preview.pl)}
                    </td>
                  </tr>

                  <tr className="fin-dre__result fin-dre__result--profit">
                    <td>Lucro líquido do mês</td>
                    <td>Resultado final</td>
                    <td className={`fin-dre__val ${moneyClass(preview.lucro)}`}>
                      {formatCurrency(preview.lucro)}
                    </td>
                  </tr>

                  <tr className="fin-dre__section fin-dre__section--reserve">
                    <td>Reservas</td>
                    <td colSpan={2}>
                      <span className="fin-dre__rates">
                        Mkt{' '}
                        <input
                          className="fin-dre__pct"
                          type="number"
                          value={rMkt}
                          onChange={(e) => setRMkt(Number(e.target.value) || 0)}
                        />
                        % · Giro{' '}
                        <input
                          className="fin-dre__pct"
                          type="number"
                          value={rWork}
                          onChange={(e) => setRWork(Number(e.target.value) || 0)}
                        />
                        % · Exp.{' '}
                        <input
                          className="fin-dre__pct"
                          type="number"
                          value={rExp}
                          onChange={(e) => setRExp(Number(e.target.value) || 0)}
                        />
                        %
                      </span>
                    </td>
                  </tr>
                  {preview.reserves.map((r) => (
                    <tr key={r.name} className="fin-dre__row--reserve">
                      <td />
                      <td>{r.name}</td>
                      <td className={`fin-dre__val ${moneyClass(r.amount, { invert: true })}`}>
                        {formatCurrency(r.amount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="fin-dre__total fin-dre__total--reserve">
                    <td />
                    <td>Total Reservas</td>
                    <td className={`fin-dre__val ${moneyClass(preview.totalReservas, { invert: true })}`}>
                      {formatCurrency(preview.totalReservas)}
                    </td>
                  </tr>

                  <tr className="fin-dre__result fin-dre__result--cash">
                    <td>Caixa livre</td>
                    <td>Saldo disponível após reservas</td>
                    <td className={`fin-dre__val ${moneyClass(preview.caixaLivre)}`}>
                      {formatCurrency(preview.caixaLivre)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <aside className="fin-dre__summary">
              <h3>Resumo executivo</h3>
              <dl>
                <div className="fin-dre__summary-row fin-dre__summary-row--income">
                  <dt>Receita Bruta</dt>
                  <dd>{formatCurrency(preview.receitaBruta)}</dd>
                </div>
                <div className="fin-dre__summary-row fin-dre__summary-row--tax">
                  <dt>Impostos e Taxas</dt>
                  <dd>{formatCurrency(preview.impostos)}</dd>
                </div>
                <div className="fin-dre__summary-row fin-dre__summary-row--cost">
                  <dt>Despesas operacionais</dt>
                  <dd>{formatCurrency(preview.ferramentas)}</dd>
                </div>
                <div className="fin-dre__summary-row fin-dre__summary-row--payroll">
                  <dt>Pró-labore</dt>
                  <dd>{formatCurrency(preview.pl)}</dd>
                </div>
                <div className="fin-dre__summary-row fin-dre__summary-row--profit">
                  <dt>Lucro Líquido</dt>
                  <dd>{formatCurrency(preview.lucro)}</dd>
                </div>
                <div className="fin-dre__summary-row fin-dre__summary-row--reserve">
                  <dt>Reservas</dt>
                  <dd>{formatCurrency(preview.totalReservas)}</dd>
                </div>
                <div className="fin-dre__summary-accent">
                  <dt>Caixa Livre</dt>
                  <dd className={moneyClass(preview.caixaLivre)}>
                    {formatCurrency(preview.caixaLivre)}
                  </dd>
                </div>
              </dl>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
