import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function SettingsModal({ onClose }) {
  const [settings, setSettings] = useState(null);
  const [services, setServices] = useState([]);
  const [newName, setNewName] = useState('');
  const [newBlock, setNewBlock] = useState('setup');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('empresa');

  useEffect(() => {
    Promise.all([api.getSettings(), api.listServices()])
      .then(([s, list]) => {
        setSettings(s);
        setServices(list);
      })
      .catch((err) => setError(err.message));
  }, []);

  async function saveSettings(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      setSettings(await api.updateSettings(settings));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function addService(event) {
    event.preventDefault();
    if (!newName.trim()) return;
    try {
      const created = await api.createService({
        name: newName.trim(),
        block: newBlock,
      });
      setServices((prev) => [...prev, created]);
      setNewName('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleService(service) {
    try {
      const updated = await api.patchService(service.id, {
        active: !service.active,
      });
      setServices((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s)),
      );
    } catch (err) {
      setError(err.message);
    }
  }

  if (!settings) {
    return (
      <div className="prop-modal-backdrop">
        <div className="prop-modal">
          <p>{error || 'Carregando…'}</p>
          <button type="button" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="prop-modal-backdrop" onClick={onClose}>
      <div
        className="prop-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="prop-modal__header">
          <h2>Configurações</h2>
          <button type="button" className="prop-icon-btn" onClick={onClose}>
            ✕
          </button>
        </header>

        <div className="prop-tabs">
          <button
            type="button"
            className={tab === 'empresa' ? 'is-active' : ''}
            onClick={() => setTab('empresa')}
          >
            Empresa
          </button>
          <button
            type="button"
            className={tab === 'servicos' ? 'is-active' : ''}
            onClick={() => setTab('servicos')}
          >
            Serviços
          </button>
        </div>

        {error && <p className="prop-error">{error}</p>}

        {tab === 'empresa' ? (
          <form className="prop-form-grid" onSubmit={saveSettings}>
            <label>
              Nome
              <input
                value={settings.companyName}
                onChange={(e) =>
                  setSettings({ ...settings, companyName: e.target.value })
                }
              />
            </label>
            <label>
              E-mail
              <input
                value={settings.contactEmail}
                onChange={(e) =>
                  setSettings({ ...settings, contactEmail: e.target.value })
                }
              />
            </label>
            <label>
              Telefone
              <input
                value={settings.contactPhone}
                onChange={(e) =>
                  setSettings({ ...settings, contactPhone: e.target.value })
                }
              />
            </label>
            <label>
              Site
              <input
                value={settings.contactWebsite}
                onChange={(e) =>
                  setSettings({ ...settings, contactWebsite: e.target.value })
                }
              />
            </label>
            <label>
              WhatsApp (DDI+DDD+número)
              <input
                value={settings.whatsappNumber}
                onChange={(e) =>
                  setSettings({ ...settings, whatsappNumber: e.target.value })
                }
              />
            </label>
            <label>
              Responsável padrão
              <input
                value={settings.defaultResponsible}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultResponsible: e.target.value,
                  })
                }
              />
            </label>
            <label>
              Logo (URL)
              <input
                value={settings.logoUrl}
                onChange={(e) =>
                  setSettings({ ...settings, logoUrl: e.target.value })
                }
              />
            </label>

            <p className="prop-form-section">Dados para contrato</p>
            <label>
              Razão social
              <input
                value={settings.legalName || ''}
                onChange={(e) =>
                  setSettings({ ...settings, legalName: e.target.value })
                }
              />
            </label>
            <label>
              CNPJ
              <input
                value={settings.legalDocument || ''}
                onChange={(e) =>
                  setSettings({ ...settings, legalDocument: e.target.value })
                }
              />
            </label>
            <label>
              Endereço completo
              <input
                value={settings.legalAddress || ''}
                onChange={(e) =>
                  setSettings({ ...settings, legalAddress: e.target.value })
                }
              />
            </label>
            <label>
              Representante legal
              <input
                value={settings.legalRepName || ''}
                onChange={(e) =>
                  setSettings({ ...settings, legalRepName: e.target.value })
                }
              />
            </label>
            <label>
              Cargo do representante
              <input
                value={settings.legalRepRole || ''}
                onChange={(e) =>
                  setSettings({ ...settings, legalRepRole: e.target.value })
                }
              />
            </label>
            <button type="submit" className="lp-btn lp-btn--solid" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar configurações'}
            </button>
          </form>
        ) : (
          <div className="prop-services-admin">
            <form className="prop-inline-form" onSubmit={addService}>
              <input
                placeholder="Novo serviço"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <select
                value={newBlock}
                onChange={(e) => setNewBlock(e.target.value)}
              >
                <option value="setup">Setup</option>
                <option value="operacao">Operação</option>
              </select>
              <button type="submit" className="lp-btn lp-btn--solid lp-btn--sm">
                Adicionar
              </button>
            </form>
            <ul className="prop-service-admin-list">
              {services.map((service) => (
                <li key={service.id}>
                  <span>
                    <strong>{service.block}</strong> — {service.name}
                  </span>
                  <button
                    type="button"
                    className="prop-link"
                    onClick={() => toggleService(service)}
                  >
                    {service.active ? 'Desativar' : 'Ativar'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
