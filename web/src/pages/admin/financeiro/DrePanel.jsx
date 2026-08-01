import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../lib/api';
import { formatCurrency } from '../../../data/proposalTemplates';

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function pctLabel(rate) {
  return `${Math.round((Number(rate) || 0) * 1000) / 10}%`;
}

export default function DrePanel({ onOpenAsaas }) {
  const [month, setMonth] = useState(currentMonth);
  const [dre, setDre] = useState(null);
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

  async function load(m = month) {
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
      setAsaasFeesOverride('');
    } catch (err) {
      setError(err.message || 'Falha ao carregar DRE');
      setDre(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

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
    const resultadoOp = Math.round((receitaBruta - impostos - ferramentas) * 100) / 100;
    const lucro = Math.round((resultadoOp - pl) * 100) / 100;
    const reserves = [
      { name: `Marketing (${pctLabel(rMkt / 100)})`, amount: Math.round(receitaBruta * (rMkt / 100) * 100) / 100 },
      { name: `Capital de Giro (${pctLabel(rWork / 100)})`, amount: Math.round(receitaBruta * (rWork / 100) * 100) / 100 },
      { name: `Expansão (${pctLabel(rExp / 100)})`, amount: Math.round(receitaBruta * (rExp / 100) * 100) / 100 },
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
      name: section === 'tools' ? 'Nova ferramenta' : 'Novo sócio',
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
      await load(month);
    } catch (err) {
      setError(err.message || 'Falha ao salvar DRE');
    } finally {
      setSaving(false);
    }
  }

  if (loading && !dre) {
    return <p className="prop-muted">Carregando DRE…</p>;
  }

  if (!dre || !preview) {
    return <p className="prop-error">{error || 'Não foi possível montar o DRE.'}</p>;
  }

  return (
    <div className="fin-dre">
      <div className="fin-dre__toolbar">
        <label className="fin-dre__month">
          <span>Mês</span>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
        <p className="fin-dre__period">
          Período: <strong>{dre.period?.label}</strong>
        </p>
        <label className="fin-dre__day">
          <span>Início do mês comercial</span>
          <input
            type="number"
            min={1}
            max={28}
            value={periodStartDay}
            onChange={(e) => setPeriodStartDay(Number(e.target.value) || 1)}
          />
        </label>
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

      {error ? <p className="prop-error">{error}</p> : null}
      {ok ? <p className="prop-ok">{ok}</p> : null}

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
              <tr className="fin-dre__section">
                <td>RECEITAS</td>
                <td colSpan={2} />
              </tr>
              {(dre.revenues || []).length === 0 ? (
                <tr>
                  <td />
                  <td className="prop-muted">Nenhuma cobrança recebida no período</td>
                  <td className="fin-dre__val">0,00</td>
                </tr>
              ) : (
                dre.revenues.map((r) => (
                  <tr key={r.id}>
                    <td />
                    <td>{r.description}</td>
                    <td className="fin-dre__val">{formatCurrency(r.value)}</td>
                  </tr>
                ))
              )}
              <tr className="fin-dre__total">
                <td />
                <td>Receita Bruta</td>
                <td className="fin-dre__val">{formatCurrency(preview.receitaBruta)}</td>
              </tr>

              <tr className="fin-dre__section">
                <td>(-) IMPOSTOS E TAXAS</td>
                <td colSpan={2} />
              </tr>
              <tr>
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
                <td className="fin-dre__val">{formatCurrency(preview.simples)}</td>
              </tr>
              <tr>
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
                <td className="fin-dre__val">{formatCurrency(preview.taxasAsaas)}</td>
              </tr>
              <tr className="fin-dre__total">
                <td />
                <td>Total Impostos e Taxas</td>
                <td className="fin-dre__val">{formatCurrency(preview.impostos)}</td>
              </tr>

              <tr className="fin-dre__section">
                <td>(-) FERRAMENTAS</td>
                <td colSpan={2}>
                  <button
                    type="button"
                    className="prop-link"
                    onClick={() => addLine('tools')}
                  >
                    + Item
                  </button>
                </td>
              </tr>
              {tools.map((row, index) => (
                <tr key={row.id || index}>
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
                      className="prop-link"
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
              <tr className="fin-dre__total">
                <td />
                <td>Total Ferramentas</td>
                <td className="fin-dre__val">{formatCurrency(preview.ferramentas)}</td>
              </tr>

              <tr className="fin-dre__result">
                <td>RESULTADO OPERACIONAL</td>
                <td>Receita após impostos e ferramentas</td>
                <td className="fin-dre__val">{formatCurrency(preview.resultadoOp)}</td>
              </tr>

              <tr className="fin-dre__section">
                <td>PRÓ-LABORE</td>
                <td colSpan={2}>
                  <button
                    type="button"
                    className="prop-link"
                    onClick={() => addLine('prolabore')}
                  >
                    + Item
                  </button>
                </td>
              </tr>
              {prolabore.map((row, index) => (
                <tr key={row.id || index}>
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
                      className="prop-link"
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
              <tr className="fin-dre__total">
                <td />
                <td>Total Pró-labore</td>
                <td className="fin-dre__val">{formatCurrency(preview.pl)}</td>
              </tr>

              <tr className="fin-dre__result">
                <td>LUCRO LÍQUIDO DO MÊS</td>
                <td>Resultado final</td>
                <td className="fin-dre__val">{formatCurrency(preview.lucro)}</td>
              </tr>

              <tr className="fin-dre__section">
                <td>RESERVAS</td>
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
                <tr key={r.name}>
                  <td />
                  <td>{r.name}</td>
                  <td className="fin-dre__val">{formatCurrency(r.amount)}</td>
                </tr>
              ))}
              <tr className="fin-dre__total">
                <td />
                <td>Total Reservas</td>
                <td className="fin-dre__val">{formatCurrency(preview.totalReservas)}</td>
              </tr>

              <tr className="fin-dre__result fin-dre__result--accent">
                <td>CAIXA LIVRE</td>
                <td>Saldo disponível após reservas</td>
                <td className="fin-dre__val">{formatCurrency(preview.caixaLivre)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <aside className="fin-dre__summary">
          <h3>Resumo executivo</h3>
          <dl>
            <div>
              <dt>Receita Bruta</dt>
              <dd>{formatCurrency(preview.receitaBruta)}</dd>
            </div>
            <div>
              <dt>Impostos e Taxas</dt>
              <dd>{formatCurrency(preview.impostos)}</dd>
            </div>
            <div>
              <dt>Ferramentas</dt>
              <dd>{formatCurrency(preview.ferramentas)}</dd>
            </div>
            <div>
              <dt>Pró-labore</dt>
              <dd>{formatCurrency(preview.pl)}</dd>
            </div>
            <div>
              <dt>Lucro Líquido</dt>
              <dd>{formatCurrency(preview.lucro)}</dd>
            </div>
            <div>
              <dt>Reservas</dt>
              <dd>{formatCurrency(preview.totalReservas)}</dd>
            </div>
            <div className="fin-dre__summary-accent">
              <dt>Caixa Livre</dt>
              <dd>{formatCurrency(preview.caixaLivre)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
