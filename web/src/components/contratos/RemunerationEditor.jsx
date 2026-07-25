import { commissionRangeLabel } from '../../data/contractTemplates';

function Toggle({ checked, onChange, label, nature }) {
  return (
    <header className="prop-block__header">
      <label className="prop-switch">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{label}</span>
      </label>
      {nature && <span className="prop-block__nature">{nature}</span>}
    </header>
  );
}

export default function RemunerationEditor({ contract, onChange }) {
  const set = (partial) => onChange({ ...contract, ...partial });

  function setTier(index, partial) {
    const next = [...(contract.commissionTiers || [])];
    next[index] = { ...next[index], ...partial };
    set({ commissionTiers: next });
  }

  function addTier() {
    const tiers = contract.commissionTiers || [];
    const last = tiers[tiers.length - 1];
    const from = last && last.to != null ? Number(last.to) : 0;
    set({
      commissionTiers: [...tiers, { from, to: null, percent: 5 }],
    });
  }

  function removeTier(index) {
    set({
      commissionTiers: (contract.commissionTiers || []).filter(
        (_, i) => i !== index,
      ),
    });
  }

  return (
    <div className="remuneration-editor">
      <section
        className={`prop-block ${contract.setupEnabled ? 'is-on' : 'is-off'}`}
      >
        <Toggle
          checked={contract.setupEnabled}
          onChange={(setupEnabled) => set({ setupEnabled })}
          label="Investimento de setup (pontual)"
          nature="Único"
        />
        {contract.setupEnabled && (
          <div className="prop-block__body">
            <div className="prop-form-row">
              <label>
                Título
                <input
                  value={contract.setupTitle}
                  onChange={(e) => set({ setupTitle: e.target.value })}
                />
              </label>
              <label>
                Valor
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={contract.setupPrice}
                  onChange={(e) => set({ setupPrice: Number(e.target.value) })}
                />
              </label>
            </div>
            <label className="prop-full">
              Descrição
              <input
                value={contract.setupDescription}
                onChange={(e) => set({ setupDescription: e.target.value })}
              />
            </label>
          </div>
        )}
      </section>

      <section
        className={`prop-block ${contract.feeEnabled ? 'is-on' : 'is-off'}`}
      >
        <Toggle
          checked={contract.feeEnabled}
          onChange={(feeEnabled) => set({ feeEnabled })}
          label="Fee mensal fixo"
          nature="Mensal"
        />
        {contract.feeEnabled && (
          <div className="prop-block__body">
            <div className="prop-form-row">
              <label>
                Título
                <input
                  value={contract.feeTitle}
                  onChange={(e) => set({ feeTitle: e.target.value })}
                />
              </label>
              <label>
                Valor mensal
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={contract.feePrice}
                  onChange={(e) => set({ feePrice: Number(e.target.value) })}
                />
              </label>
            </div>
            <label className="prop-full">
              Descrição
              <input
                value={contract.feeDescription}
                onChange={(e) => set({ feeDescription: e.target.value })}
              />
            </label>
          </div>
        )}
      </section>

      <section
        className={`prop-block ${
          contract.commissionEnabled ? 'is-on' : 'is-off'
        }`}
      >
        <Toggle
          checked={contract.commissionEnabled}
          onChange={(commissionEnabled) => set({ commissionEnabled })}
          label="Comissionamento por faixas"
          nature="Variável"
        />
        {contract.commissionEnabled && (
          <div className="prop-block__body">
            <label className="prop-full">
              Base de cálculo
              <input
                value={contract.commissionBaseLabel}
                onChange={(e) => set({ commissionBaseLabel: e.target.value })}
                placeholder="faturamento bruto mensal na plataforma X"
              />
            </label>

            <div className="commission-tiers">
              <div className="commission-tiers__head">
                <span>Faixa (de → até)</span>
                <span>%</span>
                <span />
              </div>
              {(contract.commissionTiers || []).map((tier, index) => (
                <div key={index} className="commission-tiers__row">
                  <div className="commission-tiers__range">
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={tier.from ?? 0}
                      onChange={(e) =>
                        setTier(index, { from: Number(e.target.value) })
                      }
                    />
                    <span>→</span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="∞"
                      value={tier.to ?? ''}
                      onChange={(e) =>
                        setTier(index, {
                          to:
                            e.target.value === ''
                              ? null
                              : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={tier.percent ?? 0}
                    onChange={(e) =>
                      setTier(index, { percent: Number(e.target.value) })
                    }
                  />
                  <button
                    type="button"
                    className="prop-link"
                    onClick={() => removeTier(index)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="lp-btn lp-btn--ghost lp-btn--sm"
                onClick={addTier}
              >
                + Faixa
              </button>
              {(contract.commissionTiers || []).length > 0 && (
                <p className="prop-muted commission-tiers__preview">
                  {contract.commissionTiers
                    .map((t) => `${commissionRangeLabel(t)}: ${t.percent}%`)
                    .join(' · ')}
                </p>
              )}
            </div>

            <div className="prop-form-row">
              <label>
                Dia de fechamento
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={contract.commissionCloseDay}
                  onChange={(e) =>
                    set({ commissionCloseDay: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Dia de pagamento
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={contract.commissionPayDay}
                  onChange={(e) =>
                    set({ commissionPayDay: Number(e.target.value) })
                  }
                />
              </label>
            </div>
          </div>
        )}
      </section>

      <section
        className={`prop-block ${contract.mediaEnabled ? 'is-on' : 'is-off'}`}
      >
        <Toggle
          checked={contract.mediaEnabled}
          onChange={(mediaEnabled) => set({ mediaEnabled })}
          label="Verba de mídia à parte"
          nature="À parte"
        />
        {contract.mediaEnabled && (
          <div className="prop-block__body">
            <label className="prop-full">
              Verba mensal sugerida
              <input
                type="number"
                min="0"
                step="100"
                value={contract.mediaMonthlyBudget}
                onChange={(e) =>
                  set({ mediaMonthlyBudget: Number(e.target.value) })
                }
              />
            </label>
            <label className="prop-full">
              Observação
              <input
                value={contract.mediaNotes}
                onChange={(e) => set({ mediaNotes: e.target.value })}
              />
            </label>
          </div>
        )}
      </section>
    </div>
  );
}
