import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../../lib/api';
import { formatCurrency } from '../../../data/proposalTemplates';
import { formatEntryStatus } from '../../../data/comercialHelpers';

function addDaysISO(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function parseDueISO(dueDate) {
  if (!dueDate) return '';
  const br = String(dueDate).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  }
  return String(dueDate).slice(0, 10);
}

export default function FinanceiroPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'dashboard';
  const clientFilter = searchParams.get('clientId') || '';

  const [entries, setEntries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cashflow, setCashflow] = useState([]);
  const [horizon, setHorizon] = useState(90);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    type: 'expense',
    description: '',
    amount: 0,
    dueDate: new Date().toLocaleDateString('pt-BR'),
    categoryId: '',
  });

  async function load() {
    setLoading(true);
    setError('');
    try {
      const from = todayISO();
      const to = addDaysISO(horizon);
      const [entriesData, cats, flow] = await Promise.all([
        api.listFinanceEntries(clientFilter ? { clientId: clientFilter } : {}),
        api.listFinanceCategories(),
        api.getCashflow({ from, to }),
      ]);
      setEntries(entriesData);
      setCategories(cats);
      setCashflow(flow);
      if (!form.categoryId && cats[0]) {
        setForm((f) => ({ ...f, categoryId: cats[0].id }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horizon, clientFilter]);

  const incomeEntries = useMemo(
    () => entries.filter((e) => e.type === 'income' && e.status !== 'cancelled'),
    [entries],
  );

  const stats = useMemo(() => {
    const now = todayISO();
    const month = now.slice(0, 7);
    const openIncome = incomeEntries.filter((e) =>
      ['scheduled', 'overdue'].includes(e.status),
    );
    const overdue = openIncome.filter((e) => e.status === 'overdue');
    const monthRecv = openIncome
      .filter((e) => parseDueISO(e.dueDate).startsWith(month))
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const monthExp = entries
      .filter(
        (e) =>
          e.type === 'expense' &&
          e.status !== 'cancelled' &&
          parseDueISO(e.dueDate).startsWith(month),
      )
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const forecast30 = cashflow.reduce(
      (s, d) => s + (d.income || 0) - (d.expense || 0),
      0,
    );
    return {
      monthRecv,
      monthExp,
      overdueTotal: overdue.reduce((s, e) => s + (Number(e.amount) || 0), 0),
      overdueCount: overdue.length,
      forecast30,
      next: openIncome.slice(0, 7),
    };
  }, [entries, incomeEntries, cashflow]);

  const monthlyFlow = useMemo(() => {
    const map = {};
    for (const d of cashflow) {
      const m = d.date.slice(0, 7);
      if (!map[m]) map[m] = { month: m, income: 0, expense: 0 };
      map[m].income += d.income;
      map[m].expense += d.expense;
    }
    let bal = 0;
    return Object.values(map)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((row) => {
        bal += row.income - row.expense;
        return { ...row, balance: bal };
      });
  }, [cashflow]);

  async function markReceived(entry) {
    try {
      await api.updateFinanceEntry(entry.id, {
        status: entry.type === 'income' ? 'received' : 'paid',
        paidAt: new Date().toLocaleDateString('pt-BR'),
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function createEntry(event) {
    event.preventDefault();
    try {
      await api.createFinanceEntry({
        ...form,
        amount: Number(form.amount) || 0,
        origin: 'manual',
        status: 'scheduled',
      });
      setForm((f) => ({
        ...f,
        description: '',
        amount: 0,
      }));
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function setTab(next) {
    const params = new URLSearchParams(searchParams);
    params.set('tab', next);
    setSearchParams(params);
  }

  return (
    <div className="admin-shell prop-shell">
      <header className="admin-shell__header">
        <div className="admin-shell__brand">
          <Link to="/admin" className="prop-back">
            ← Painel
          </Link>
          <span className="admin-shell__label">Financeiro</span>
        </div>
      </header>

      <main className="admin-shell__main">
        <div className="admin-shell__intro">
          <h1 className="admin-shell__title">Financeiro</h1>
          <p className="admin-shell__subtitle">
            Fluxo de caixa, recebíveis dos contratos e lançamentos manuais.
          </p>
        </div>

        <div className="prop-template-row" style={{ marginBottom: 20 }}>
          {[
            ['dashboard', 'Dashboard'],
            ['cashflow', 'Fluxo / previsão'],
            ['receivables', 'A receber'],
            ['entries', 'Despesas e receitas'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`prop-chip ${tab === value ? 'is-active' : ''}`}
              onClick={() => setTab(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {error && <p className="prop-error">{error}</p>}
        {loading ? (
          <p className="prop-muted">Carregando…</p>
        ) : (
          <>
            {tab === 'dashboard' && (
              <div className="fin-dashboard">
                <div className="fin-kpis">
                  <div className="fin-kpi">
                    <span>Saldo previsto ({horizon}d)</span>
                    <strong>{formatCurrency(stats.forecast30)}</strong>
                  </div>
                  <div className="fin-kpi">
                    <span>A receber no mês</span>
                    <strong>{formatCurrency(stats.monthRecv)}</strong>
                  </div>
                  <div className="fin-kpi">
                    <span>Despesas no mês</span>
                    <strong>{formatCurrency(stats.monthExp)}</strong>
                  </div>
                  <div className="fin-kpi">
                    <span>Atrasados</span>
                    <strong>
                      {formatCurrency(stats.overdueTotal)}
                      <small> · {stats.overdueCount}</small>
                    </strong>
                  </div>
                </div>

                <section className="prop-card">
                  <h3>Próximos vencimentos</h3>
                  {stats.next.length === 0 ? (
                    <p className="prop-muted">Nenhum recebível em aberto.</p>
                  ) : (
                    <ul className="lead-receivables">
                      {stats.next.map((e) => (
                        <li key={e.id}>
                          <span>
                            {e.description} · {e.dueDate}
                          </span>
                          <strong>
                            {formatCurrency(e.amount)}{' '}
                            <small>{formatEntryStatus(e.status)}</small>
                          </strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            )}

            {tab === 'cashflow' && (
              <div>
                <div className="prop-template-row" style={{ marginBottom: 16 }}>
                  {[30, 60, 90].map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`prop-chip ${horizon === d ? 'is-active' : ''}`}
                      onClick={() => setHorizon(d)}
                    >
                      {d} dias
                    </button>
                  ))}
                </div>
                <div className="prop-table-wrap">
                  <table className="prop-table">
                    <thead>
                      <tr>
                        <th>Mês</th>
                        <th>Entradas</th>
                        <th>Saídas</th>
                        <th>Saldo acum.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyFlow.map((row) => (
                        <tr key={row.month}>
                          <td>{row.month}</td>
                          <td>{formatCurrency(row.income)}</td>
                          <td>{formatCurrency(row.expense)}</td>
                          <td>{formatCurrency(row.balance)}</td>
                        </tr>
                      ))}
                      {monthlyFlow.length === 0 && (
                        <tr>
                          <td colSpan={4}>Sem lançamentos no período.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'receivables' && (
              <div className="prop-table-wrap">
                <table className="prop-table">
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Vencimento</th>
                      <th>Origem</th>
                      <th>Status</th>
                      <th>Valor</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomeEntries.map((e) => (
                      <tr key={e.id}>
                        <td>
                          {e.description}
                          {e.proposalId && (
                            <>
                              <br />
                              <Link
                                className="prop-link"
                                to={`/admin/comercial/${e.proposalId}`}
                              >
                                Abrir lead
                              </Link>
                            </>
                          )}
                        </td>
                        <td>{e.dueDate}</td>
                        <td>{e.origin}</td>
                        <td>
                          <span className={`prop-status prop-status--${e.status}`}>
                            {formatEntryStatus(e.status)}
                          </span>
                        </td>
                        <td>{formatCurrency(e.amount)}</td>
                        <td>
                          {['scheduled', 'overdue'].includes(e.status) && (
                            <button
                              type="button"
                              className="prop-link"
                              onClick={() => markReceived(e)}
                            >
                              Marcar recebido
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'entries' && (
              <div className="fin-entries">
                <form className="prop-card" onSubmit={createEntry}>
                  <h3>Novo lançamento</h3>
                  <div className="prop-form-row">
                    <label>
                      Tipo
                      <select
                        value={form.type}
                        onChange={(e) =>
                          setForm({ ...form, type: e.target.value })
                        }
                      >
                        <option value="expense">Despesa</option>
                        <option value="income">Receita</option>
                      </select>
                    </label>
                    <label>
                      Categoria
                      <select
                        value={form.categoryId}
                        onChange={(e) =>
                          setForm({ ...form, categoryId: e.target.value })
                        }
                      >
                        {categories
                          .filter((c) => c.kind === form.type)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  </div>
                  <div className="prop-form-row">
                    <label>
                      Descrição
                      <input
                        value={form.description}
                        onChange={(e) =>
                          setForm({ ...form, description: e.target.value })
                        }
                        required
                      />
                    </label>
                    <label>
                      Valor
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.amount}
                        onChange={(e) =>
                          setForm({ ...form, amount: e.target.value })
                        }
                      />
                    </label>
                  </div>
                  <label className="prop-full">
                    Vencimento
                    <input
                      value={form.dueDate}
                      onChange={(e) =>
                        setForm({ ...form, dueDate: e.target.value })
                      }
                    />
                  </label>
                  <button type="submit" className="lp-btn lp-btn--solid lp-btn--sm">
                    Adicionar
                  </button>
                </form>

                <div className="prop-table-wrap">
                  <table className="prop-table">
                    <thead>
                      <tr>
                        <th>Tipo</th>
                        <th>Descrição</th>
                        <th>Vencimento</th>
                        <th>Status</th>
                        <th>Valor</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries
                        .filter((e) => e.status !== 'cancelled')
                        .map((e) => (
                          <tr key={e.id}>
                            <td>{e.type === 'income' ? 'Receita' : 'Despesa'}</td>
                            <td>{e.description}</td>
                            <td>{e.dueDate}</td>
                            <td>{formatEntryStatus(e.status)}</td>
                            <td>{formatCurrency(e.amount)}</td>
                            <td>
                              {['scheduled', 'overdue'].includes(e.status) && (
                                <button
                                  type="button"
                                  className="prop-link"
                                  onClick={() => markReceived(e)}
                                >
                                  {e.type === 'income'
                                    ? 'Recebido'
                                    : 'Pago'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
