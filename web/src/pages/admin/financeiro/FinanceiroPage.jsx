import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../../lib/api';
import { formatCurrency } from '../../../data/proposalTemplates';
import { formatEntryStatus } from '../../../data/comercialHelpers';
import {
  fromDateInputValue,
  toDateInputValue,
} from '../../../components/contratos/AsaasBillingFields';
import DrePanel from './DrePanel';

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

function clientLabel(client) {
  if (!client) return '';
  return client.tradeName || client.legalName || client.name || 'Cliente';
}

function entryHeadline(entry, clientsById = {}) {
  const fromEntry = String(entry.clientName || '').trim();
  const fromMap = clientLabel(clientsById[entry.clientId]);
  const name = fromEntry || fromMap;
  const raw = String(entry.description || '').trim();
  // Evita "Nome · Nome · Fee" se a descrição já começa com o cliente
  if (name && raw) {
    if (raw.toLowerCase().startsWith(name.toLowerCase())) return raw;
    return `${name} · ${raw}`;
  }
  return name || raw || originLabel(entry.origin);
}

function entrySubline(entry) {
  const bits = [];
  if (entry.origin) bits.push(originLabel(entry.origin));
  if (entry.dueDate) bits.push(entry.dueDate);
  if (entry.status === 'overdue') bits.push('atrasado');
  return bits.join(' · ');
}

function originLabel(origin) {
  const map = {
    contract_setup: 'Setup',
    contract_fee: 'Fee',
    contract_commission: 'Comissão',
    manual: 'Manual',
  };
  return map[origin] || origin || '—';
}

function asaasStatusLabel(status) {
  const map = {
    PENDING: 'Pendente',
    OVERDUE: 'Vencida',
    CONFIRMED: 'Confirmada',
    RECEIVED: 'Recebida',
    RECEIVED_IN_CASH: 'Recebida',
    REFUNDED: 'Estornada',
  };
  return map[status] || status || '—';
}

function emptyAsaas() {
  return {
    configured: false,
    balance: 0,
    pending: { count: 0, value: 0 },
    overdue: { count: 0, value: 0 },
    confirmed: { count: 0, value: 0 },
    receivedMonth: { count: 0, value: 0 },
    toReceive: { count: 0, value: 0 },
    recent: [],
    insights: {
      mrr: 0,
      unchargedCount: 0,
      unchargedValue: 0,
      scheduledMonth: 0,
      receivedVsScheduled: { received: 0, scheduled: 0 },
    },
  };
}

export default function FinanceiroPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'dre';
  const clientFilter = searchParams.get('clientId') || '';

  const [entries, setEntries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [clients, setClients] = useState([]);
  const [cashflow, setCashflow] = useState([]);
  const [asaas, setAsaas] = useState(emptyAsaas);
  const [asaasPayments, setAsaasPayments] = useState([]);
  const [asaasPayStatus, setAsaasPayStatus] = useState('PENDING');
  const [horizon, setHorizon] = useState(90);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [chargingId, setChargingId] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [recvFilter, setRecvFilter] = useState({
    status: 'open',
    origin: '',
    q: '',
  });
  const [entryTypeFilter, setEntryTypeFilter] = useState('all');
  const [editingId, setEditingId] = useState('');
  const [editDraft, setEditDraft] = useState(null);
  const [form, setForm] = useState({
    type: 'expense',
    description: '',
    amount: 0,
    dueDate: todayISO(),
    categoryId: '',
    clientId: '',
  });

  const clientsById = useMemo(() => {
    const map = {};
    for (const c of clients) map[c.id] = c;
    return map;
  }, [clients]);

  function showToast(msg) {
    setToast(msg);
    window.setTimeout(() => setToast(''), 3200);
  }

  async function load(opts = {}) {
    const quiet = Boolean(opts.quiet);
    if (!quiet) setLoading(true);
    setError('');
    try {
      const from = todayISO();
      const to = addDaysISO(horizon);
      const [entriesData, cats, flow, clientList, overview] = await Promise.all([
        api.listFinanceEntries(clientFilter ? { clientId: clientFilter } : {}),
        api.listFinanceCategories(),
        api.getCashflow({ from, to }),
        api.listClients(),
        api.getAsaasFinanceOverview().catch(() => emptyAsaas()),
      ]);
      setEntries(entriesData);
      setCategories(cats);
      setCashflow(flow);
      setClients(clientList || []);
      setAsaas(overview || emptyAsaas());
      if (!form.categoryId && cats[0]) {
        setForm((f) => ({ ...f, categoryId: cats[0].id }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  async function loadAsaasPayments(status = asaasPayStatus) {
    try {
      const res = await api.listAsaasFinancePayments({
        status: status === 'ALL' ? undefined : status,
        limit: 50,
      });
      setAsaasPayments(res?.data || []);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horizon, clientFilter]);

  useEffect(() => {
    if (tab === 'asaas') loadAsaasPayments(asaasPayStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, asaasPayStatus]);

  const incomeEntries = useMemo(
    () => entries.filter((e) => e.type === 'income' && e.status !== 'cancelled'),
    [entries],
  );

  const filteredReceivables = useMemo(() => {
    const q = recvFilter.q.trim().toLowerCase();
    return incomeEntries.filter((e) => {
      if (recvFilter.status === 'open') {
        if (!['scheduled', 'overdue'].includes(e.status)) return false;
      } else if (recvFilter.status === 'overdue') {
        if (e.status !== 'overdue') return false;
      } else if (recvFilter.status === 'received') {
        if (e.status !== 'received') return false;
      }
      if (recvFilter.origin && e.origin !== recvFilter.origin) return false;
      if (q) {
        const client = clientsById[e.clientId];
        const hay = [
          e.description,
          e.origin,
          clientLabel(client),
          e.billingType,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [incomeEntries, recvFilter, clientsById]);

  const stats = useMemo(() => {
    const now = todayISO();
    const month = now.slice(0, 7);
    const limit45 = addDaysISO(45);
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
    const billedCount = openIncome.filter((e) => e.asaasPaymentId).length;
    const next = openIncome
      .filter((e) => {
        if (e.status === 'overdue') return true;
        const iso = parseDueISO(e.dueDate);
        return iso && iso >= now && iso <= limit45;
      })
      .sort((a, b) =>
        parseDueISO(a.dueDate).localeCompare(parseDueISO(b.dueDate)),
      )
      .slice(0, 8);
    return {
      monthRecv,
      monthExp,
      overdueTotal: overdue.reduce((s, e) => s + (Number(e.amount) || 0), 0),
      overdueCount: overdue.length,
      forecast30,
      next,
      billedCount,
      openCount: openIncome.length,
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

  const listedEntries = useMemo(() => {
    return entries.filter((e) => {
      if (e.status === 'cancelled') return false;
      if (entryTypeFilter === 'income' && e.type !== 'income') return false;
      if (entryTypeFilter === 'expense' && e.type !== 'expense') return false;
      return true;
    });
  }, [entries, entryTypeFilter]);

  async function markReceived(entry) {
    try {
      await api.updateFinanceEntry(entry.id, {
        status: entry.type === 'income' ? 'received' : 'paid',
        paidAt: fromDateInputValue(todayISO()),
      });
      showToast(
        entry.type === 'income' ? 'Marcado como recebido' : 'Marcado como pago',
      );
      await load({ quiet: true });
    } catch (err) {
      setError(err.message);
    }
  }

  async function cancelEntry(entry) {
    if (entry.asaasPaymentId) {
      setError('Não é possível cancelar lançamento vinculado ao Asaas.');
      return;
    }
    if (!window.confirm('Cancelar este lançamento?')) return;
    try {
      await api.updateFinanceEntry(entry.id, { status: 'cancelled' });
      showToast('Lançamento cancelado');
      await load({ quiet: true });
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveEdit(entry) {
    try {
      await api.updateFinanceEntry(entry.id, {
        description: editDraft.description,
        amount: Number(editDraft.amount) || 0,
        dueDate: fromDateInputValue(editDraft.dueDate),
        clientId: editDraft.clientId || null,
        type: editDraft.type,
      });
      setEditingId('');
      setEditDraft(null);
      showToast('Lançamento atualizado');
      await load({ quiet: true });
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
        dueDate: fromDateInputValue(form.dueDate),
        clientId: form.clientId || null,
        origin: 'manual',
        status: 'scheduled',
      });
      setForm((f) => ({
        ...f,
        description: '',
        amount: 0,
        clientId: '',
      }));
      showToast('Lançamento adicionado');
      await load({ quiet: true });
    } catch (err) {
      setError(err.message);
    }
  }

  async function syncAsaas() {
    setSyncing(true);
    setError('');
    try {
      const result = await api.syncAsaasFinance({ days: 90 });
      showToast(
        `Asaas sincronizado: ${result.created || 0} novos, ${result.updated || 0} atualizados`,
      );
      await load({ quiet: true });
      if (tab === 'asaas') await loadAsaasPayments();
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  }

  async function sendCharge(entry) {
    if (!entry.contractId) {
      setError('Lançamento sem contrato vinculado.');
      return;
    }
    setChargingId(entry.id);
    setError('');
    try {
      if (entry.origin === 'contract_commission') {
        setError(
          'Comissão: emita a cobrança no painel do cliente (valor variável).',
        );
        return;
      }
      await api.chargeContractAsaas(entry.contractId);
      showToast('Cobrança enviada no Asaas');
      await load({ quiet: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setChargingId('');
    }
  }

  function setTab(next) {
    const params = new URLSearchParams(searchParams);
    params.set('tab', next);
    setSearchParams(params);
  }

  function clearClientFilter() {
    const params = new URLSearchParams(searchParams);
    params.delete('clientId');
    setSearchParams(params);
  }

  const filteredClient = clientsById[clientFilter];
  const insights = asaas.insights || emptyAsaas().insights;

  return (
    <div className="admin-shell prop-shell">
      {toast ? (
        <div className="prop-toast" role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}

      <header className="admin-shell__header">
        <div className="admin-shell__brand">
          <Link to="/admin" className="prop-back">
            ← Painel
          </Link>
          <span className="admin-shell__label">Financeiro</span>
        </div>
        <div className="admin-shell__actions">
          <button
            type="button"
            className="lp-btn lp-btn--ghost lp-btn--sm"
            onClick={() => syncAsaas()}
            disabled={syncing || !asaas.configured}
          >
            {syncing ? 'Sincronizando…' : 'Sincronizar Asaas'}
          </button>
        </div>
      </header>

      <main className="admin-shell__main">
        <div className="admin-shell__intro">
          <h1 className="admin-shell__title">Financeiro</h1>
          <p className="admin-shell__subtitle">
            DRE / caixa, cobranças Asaas e lançamentos.
          </p>
        </div>

        {clientFilter ? (
          <div className="fin-filter-chip">
            Filtrando por cliente:{' '}
            <strong>{clientLabel(filteredClient) || clientFilter}</strong>
            <button type="button" className="prop-link" onClick={clearClientFilter}>
              Limpar filtro
            </button>
          </div>
        ) : null}

        <div className="prop-template-row" style={{ marginBottom: 20 }}>
          {[
            ['dre', 'DRE / Caixa'],
            ['dashboard', 'Dashboard'],
            ['cashflow', 'Fluxo / previsão'],
            ['receivables', 'A receber'],
            ['asaas', 'Cobranças Asaas'],
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
        {tab === 'dre' ? (
          <DrePanel onOpenAsaas={() => setTab('asaas')} />
        ) : loading ? (
          <p className="prop-muted">Carregando…</p>
        ) : (
          <>
            {tab === 'dashboard' && (
              <div className="fin-dashboard">
                {!asaas.configured ? (
                  <p className="prop-muted" style={{ marginBottom: 20 }}>
                    Asaas não configurado nesta API. Defina ASAAS_API_KEY para
                    ver saldo e cobranças.
                  </p>
                ) : (
                  <section className="fin-hero">
                    <div className="fin-hero__balance">
                      <span>Saldo Asaas</span>
                      <strong>{formatCurrency(asaas.balance)}</strong>
                      <button
                        type="button"
                        className="prop-link"
                        onClick={() => syncAsaas()}
                        disabled={syncing}
                      >
                        {syncing ? 'Sincronizando…' : 'Atualizar'}
                      </button>
                    </div>
                    <div className="fin-hero__metrics">
                      <div>
                        <span>A receber</span>
                        <strong>
                          {formatCurrency(asaas.toReceive?.value || 0)}
                        </strong>
                        <small>{asaas.toReceive?.count || 0} cobr.</small>
                      </div>
                      <div>
                        <span>Vencidas</span>
                        <strong>
                          {formatCurrency(asaas.overdue?.value || 0)}
                        </strong>
                        <small>{asaas.overdue?.count || 0} cobr.</small>
                      </div>
                      <div>
                        <span>Recebido no mês</span>
                        <strong>
                          {formatCurrency(asaas.receivedMonth?.value || 0)}
                        </strong>
                        <small>{asaas.receivedMonth?.count || 0} cobr.</small>
                      </div>
                    </div>
                  </section>
                )}

                <p className="fin-section-title">Agenda Symbius</p>
                <div className="fin-kpis fin-kpis--agenda">
                  <div className="fin-kpi">
                    <span>Previsto ({horizon}d)</span>
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

                <section className="prop-card fin-insights">
                  <h3>Resumo</h3>
                  <ul className="fin-insights__list">
                    {(asaas.overdue?.count || 0) > 0 ? (
                      <li className="fin-insight--warn">
                        <span>Inadimplência Asaas</span>
                        <strong>
                          {formatCurrency(asaas.overdue?.value || 0)}
                          <small> · {asaas.overdue?.count || 0} cobr.</small>
                        </strong>
                      </li>
                    ) : null}
                    {insights.unchargedCount > 0 ? (
                      <li className="fin-insight--warn">
                        <div className="fin-insight__text">
                          <span>Sem cobrança Asaas (próx. 30 dias)</span>
                          <button
                            type="button"
                            className="prop-link"
                            onClick={() => setTab('receivables')}
                          >
                            Abrir A receber
                          </button>
                        </div>
                        <strong>
                          {formatCurrency(insights.unchargedValue || 0)}
                          <small> · {insights.unchargedCount}</small>
                        </strong>
                      </li>
                    ) : null}
                    <li>
                      <span>MRR (assinaturas Asaas)</span>
                      <strong>{formatCurrency(insights.mrr || 0)}</strong>
                    </li>
                    <li>
                      <span>Recebido vs previsto (mês)</span>
                      <strong>
                        {formatCurrency(
                          insights.receivedVsScheduled?.received || 0,
                        )}
                        <small>
                          {' '}
                          /{' '}
                          {formatCurrency(
                            insights.receivedVsScheduled?.scheduled ||
                              insights.scheduledMonth ||
                              0,
                          )}
                        </small>
                      </strong>
                    </li>
                  </ul>
                </section>

                <section className="prop-card fin-dues">
                  <div className="fin-dues__head">
                    <h3>Próximos 45 dias</h3>
                    <button
                      type="button"
                      className="prop-link"
                      onClick={() => setTab('receivables')}
                    >
                      Ver todos
                    </button>
                  </div>
                  {stats.next.length === 0 ? (
                    <div className="fin-empty">
                      <p className="prop-muted">
                        Nada nos próximos 45 dias.
                      </p>
                    </div>
                  ) : (
                    <ul className="fin-dues__list">
                      {stats.next.map((e) => (
                        <li key={e.id}>
                          <div className="fin-dues__main">
                            <strong>{entryHeadline(e, clientsById)}</strong>
                            <span className="prop-muted">
                              {entrySubline(e)}
                            </span>
                          </div>
                          <div className="fin-dues__side">
                            <strong>{formatCurrency(e.amount)}</strong>
                            {e.asaasPaymentId || e.invoiceUrl ? (
                              e.invoiceUrl ? (
                                <a
                                  className="prop-link"
                                  href={e.invoiceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Fatura
                                </a>
                              ) : (
                                <span className="fin-badge fin-badge--asaas">
                                  Asaas
                                </span>
                              )
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            )}

            {tab === 'cashflow' && (
              <div>
                <p className="prop-muted" style={{ marginBottom: 12 }}>
                  Valores da <strong>agenda Symbius</strong> (previsto).
                  Cobranças já faturadas no Asaas aparecem na aba Cobranças
                  Asaas.
                </p>
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
                        <th>Entradas (previsto)</th>
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
              <div>
                <div className="fin-filters">
                  <label>
                    Status
                    <select
                      value={recvFilter.status}
                      onChange={(e) =>
                        setRecvFilter((f) => ({ ...f, status: e.target.value }))
                      }
                    >
                      <option value="open">Aberto</option>
                      <option value="overdue">Atrasado</option>
                      <option value="received">Recebido</option>
                      <option value="all">Todos</option>
                    </select>
                  </label>
                  <label>
                    Origem
                    <select
                      value={recvFilter.origin}
                      onChange={(e) =>
                        setRecvFilter((f) => ({ ...f, origin: e.target.value }))
                      }
                    >
                      <option value="">Todas</option>
                      <option value="contract_setup">Setup</option>
                      <option value="contract_fee">Fee</option>
                      <option value="contract_commission">Comissão</option>
                      <option value="manual">Manual</option>
                    </select>
                  </label>
                  <label className="fin-filters__grow">
                    Busca
                    <input
                      value={recvFilter.q}
                      onChange={(e) =>
                        setRecvFilter((f) => ({ ...f, q: e.target.value }))
                      }
                      placeholder="Cliente, descrição…"
                    />
                  </label>
                </div>

                <div className="prop-table-wrap">
                  <table className="prop-table">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Descrição</th>
                        <th>Vencimento</th>
                        <th>Origem</th>
                        <th>Asaas</th>
                        <th>Status</th>
                        <th>Valor</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReceivables.map((e) => {
                        const client = clientsById[e.clientId];
                        const open = ['scheduled', 'overdue'].includes(e.status);
                        const canCharge =
                          open &&
                          !e.asaasPaymentId &&
                          e.contractId &&
                          ['contract_setup', 'contract_fee'].includes(e.origin);
                        return (
                          <tr key={e.id}>
                            <td>
                              {client ? (
                                <Link
                                  className="prop-link"
                                  to={`/admin/clientes/${e.clientId}`}
                                >
                                  {clientLabel(client) || e.clientName || 'Cliente'}
                                </Link>
                              ) : (
                                e.clientName || '—'
                              )}
                              {e.proposalId ? (
                                <>
                                  <br />
                                  <Link
                                    className="prop-link"
                                    to={`/admin/comercial/${e.proposalId}`}
                                  >
                                    Abrir lead
                                  </Link>
                                </>
                              ) : null}
                            </td>
                            <td>
                              {entryHeadline(e, clientsById)}
                              {e.billingType ? (
                                <>
                                  <br />
                                  <small className="prop-muted">
                                    {e.billingType}
                                  </small>
                                </>
                              ) : null}
                            </td>
                            <td>{e.dueDate}</td>
                            <td>{originLabel(e.origin)}</td>
                            <td>
                              {!e.asaasPaymentId ? (
                                <span className="fin-badge">Sem cobrança</span>
                              ) : e.invoiceUrl ? (
                                <a
                                  className="prop-link"
                                  href={e.invoiceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Pendente / fatura
                                </a>
                              ) : (
                                <span className="fin-badge fin-badge--asaas">
                                  Cobrado
                                </span>
                              )}
                            </td>
                            <td>
                              <span
                                className={`prop-status prop-status--${e.status}`}
                              >
                                {formatEntryStatus(e.status)}
                              </span>
                            </td>
                            <td>{formatCurrency(e.amount)}</td>
                            <td className="fin-actions">
                              {canCharge ? (
                                <button
                                  type="button"
                                  className="lp-btn lp-btn--solid lp-btn--sm"
                                  disabled={chargingId === e.id}
                                  onClick={() => sendCharge(e)}
                                >
                                  {chargingId === e.id
                                    ? 'Enviando…'
                                    : 'Enviar cobrança'}
                                </button>
                              ) : null}
                              {e.asaasPaymentId && e.invoiceUrl ? (
                                <a
                                  className="prop-link"
                                  href={e.invoiceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Abrir fatura
                                </a>
                              ) : null}
                              {e.asaasPaymentId && open ? (
                                <button
                                  type="button"
                                  className="prop-link"
                                  onClick={() => syncAsaas()}
                                >
                                  Sync
                                </button>
                              ) : null}
                              {open && !e.asaasPaymentId ? (
                                <button
                                  type="button"
                                  className="prop-link"
                                  onClick={() => markReceived(e)}
                                >
                                  Marcar recebido
                                </button>
                              ) : null}
                              {open && e.asaasPaymentId ? (
                                <button
                                  type="button"
                                  className="prop-link prop-muted"
                                  onClick={() => markReceived(e)}
                                  title="Use se o pagamento foi fora do Asaas"
                                >
                                  Marcar recebido (manual)
                                </button>
                              ) : null}
                              {e.origin === 'contract_commission' &&
                              open &&
                              !e.asaasPaymentId &&
                              e.clientId ? (
                                <Link
                                  className="prop-link"
                                  to={`/admin/clientes/${e.clientId}`}
                                >
                                  Painel cliente
                                </Link>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredReceivables.length === 0 && (
                        <tr>
                          <td colSpan={8}>
                            <div className="fin-empty">
                              <p className="prop-muted">
                                Nenhum recebível com esses filtros.
                              </p>
                              <button
                                type="button"
                                className="prop-link"
                                onClick={() => setTab('asaas')}
                              >
                                Ver cobranças Asaas
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'asaas' && (
              <div>
                <p className="prop-muted" style={{ marginBottom: 12 }}>
                  Detalhe das cobranças Asaas (drill-down). O resultado do mês
                  está na aba DRE / Caixa.
                </p>
                {!asaas.configured ? (
                  <p className="prop-muted">
                    Configure ASAAS_API_KEY na API para listar cobranças.
                  </p>
                ) : (
                  <>
                    <div className="prop-template-row" style={{ marginBottom: 16 }}>
                      {[
                        ['PENDING', 'Pendente'],
                        ['OVERDUE', 'Vencida'],
                        ['CONFIRMED', 'Confirmada'],
                        ['RECEIVED', 'Recebida'],
                        ['ALL', 'Todas'],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          className={`prop-chip ${
                            asaasPayStatus === value ? 'is-active' : ''
                          }`}
                          onClick={() => setAsaasPayStatus(value)}
                        >
                          {label}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="lp-btn lp-btn--ghost lp-btn--sm"
                        onClick={() => syncAsaas()}
                        disabled={syncing}
                      >
                        {syncing ? 'Sincronizando…' : 'Sincronizar'}
                      </button>
                    </div>
                    <div className="prop-table-wrap">
                      <table className="prop-table">
                        <thead>
                          <tr>
                            <th>Descrição</th>
                            <th>Vencimento</th>
                            <th>Meio</th>
                            <th>Status</th>
                            <th>Valor</th>
                            <th>Conciliação</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {asaasPayments.map((p) => (
                            <tr key={p.id}>
                              <td>{p.description || p.id}</td>
                              <td>{p.dueDate || '—'}</td>
                              <td>{p.billingType || '—'}</td>
                              <td>{asaasStatusLabel(p.status)}</td>
                              <td>{formatCurrency(p.value)}</td>
                              <td>
                                {p.reconciled ? (
                                  <span className="fin-badge fin-badge--ok">
                                    Conciliada
                                  </span>
                                ) : (
                                  <span className="fin-badge">Pendente</span>
                                )}
                              </td>
                              <td>
                                {p.invoiceUrl ? (
                                  <a
                                    className="prop-link"
                                    href={p.invoiceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Abrir fatura
                                  </a>
                                ) : (
                                  '—'
                                )}
                              </td>
                            </tr>
                          ))}
                          {asaasPayments.length === 0 && (
                            <tr>
                              <td colSpan={7}>
                                <div className="fin-empty">
                                  <p className="prop-muted">
                                    Nenhuma cobrança neste filtro.
                                  </p>
                                  <button
                                    type="button"
                                    className="prop-link"
                                    onClick={() => setTab('receivables')}
                                  >
                                    Envie cobrança a partir da agenda
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
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
                  <div className="prop-form-row">
                    <label>
                      Vencimento
                      <input
                        type="date"
                        value={form.dueDate}
                        onChange={(e) =>
                          setForm({ ...form, dueDate: e.target.value })
                        }
                        required
                      />
                    </label>
                    <label>
                      Cliente (opcional)
                      <select
                        value={form.clientId}
                        onChange={(e) =>
                          setForm({ ...form, clientId: e.target.value })
                        }
                      >
                        <option value="">—</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {clientLabel(c)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button type="submit" className="lp-btn lp-btn--solid lp-btn--sm">
                    Adicionar
                  </button>
                </form>

                <div className="prop-template-row" style={{ marginBottom: 12 }}>
                  {[
                    ['all', 'Todos'],
                    ['expense', 'Despesas'],
                    ['income', 'Receitas'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`prop-chip ${
                        entryTypeFilter === value ? 'is-active' : ''
                      }`}
                      onClick={() => setEntryTypeFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="prop-table-wrap">
                  <table className="prop-table">
                    <thead>
                      <tr>
                        <th>Tipo</th>
                        <th>Cliente</th>
                        <th>Descrição</th>
                        <th>Vencimento</th>
                        <th>Status</th>
                        <th>Valor</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {listedEntries.map((e) => {
                        const client = clientsById[e.clientId];
                        const isEditing = editingId === e.id;
                        const canEdit =
                          e.origin === 'manual' &&
                          !e.asaasPaymentId &&
                          !['received', 'paid'].includes(e.status);
                        if (isEditing && editDraft) {
                          return (
                            <tr key={e.id}>
                              <td>
                                <select
                                  value={editDraft.type}
                                  onChange={(ev) =>
                                    setEditDraft({
                                      ...editDraft,
                                      type: ev.target.value,
                                    })
                                  }
                                >
                                  <option value="expense">Despesa</option>
                                  <option value="income">Receita</option>
                                </select>
                              </td>
                              <td>
                                <select
                                  value={editDraft.clientId || ''}
                                  onChange={(ev) =>
                                    setEditDraft({
                                      ...editDraft,
                                      clientId: ev.target.value,
                                    })
                                  }
                                >
                                  <option value="">—</option>
                                  {clients.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {clientLabel(c)}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  value={editDraft.description}
                                  onChange={(ev) =>
                                    setEditDraft({
                                      ...editDraft,
                                      description: ev.target.value,
                                    })
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  type="date"
                                  value={editDraft.dueDate}
                                  onChange={(ev) =>
                                    setEditDraft({
                                      ...editDraft,
                                      dueDate: ev.target.value,
                                    })
                                  }
                                />
                              </td>
                              <td>{formatEntryStatus(e.status)}</td>
                              <td>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editDraft.amount}
                                  onChange={(ev) =>
                                    setEditDraft({
                                      ...editDraft,
                                      amount: ev.target.value,
                                    })
                                  }
                                />
                              </td>
                              <td className="fin-actions">
                                <button
                                  type="button"
                                  className="prop-link"
                                  onClick={() => saveEdit(e)}
                                >
                                  Salvar
                                </button>
                                <button
                                  type="button"
                                  className="prop-link"
                                  onClick={() => {
                                    setEditingId('');
                                    setEditDraft(null);
                                  }}
                                >
                                  Cancelar
                                </button>
                              </td>
                            </tr>
                          );
                        }
                        return (
                          <tr
                            key={e.id}
                            className={
                              e.type === 'expense'
                                ? 'fin-row--expense'
                                : 'fin-row--income'
                            }
                          >
                            <td>
                              {e.type === 'income' ? 'Receita' : 'Despesa'}
                            </td>
                            <td>
                              {e.clientName ||
                                (client ? clientLabel(client) : '—')}
                            </td>
                            <td>{entryHeadline(e, clientsById)}</td>
                            <td>{e.dueDate}</td>
                            <td>{formatEntryStatus(e.status)}</td>
                            <td>{formatCurrency(e.amount)}</td>
                            <td className="fin-actions">
                              {['scheduled', 'overdue'].includes(e.status) && (
                                <button
                                  type="button"
                                  className="prop-link"
                                  onClick={() => markReceived(e)}
                                >
                                  {e.type === 'income' ? 'Recebido' : 'Pago'}
                                </button>
                              )}
                              {canEdit ? (
                                <>
                                  <button
                                    type="button"
                                    className="prop-link"
                                    onClick={() => {
                                      setEditingId(e.id);
                                      setEditDraft({
                                        type: e.type,
                                        description: e.description || '',
                                        amount: e.amount,
                                        dueDate: toDateInputValue(e.dueDate),
                                        clientId: e.clientId || '',
                                      });
                                    }}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    className="prop-link"
                                    onClick={() => cancelEntry(e)}
                                  >
                                    Cancelar
                                  </button>
                                </>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                      {listedEntries.length === 0 && (
                        <tr>
                          <td colSpan={7}>Sem lançamentos.</td>
                        </tr>
                      )}
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
