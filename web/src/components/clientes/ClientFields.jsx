const BR_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO',
];

export default function ClientFields({ client, onChange }) {
  const set = (partial) => onChange({ ...client, ...partial });

  return (
    <div className="client-fields">
      <fieldset className="prop-card">
        <h3>Identificação</h3>
        <div className="prop-form-row">
          <label>
            Razão social
            <input
              value={client.legalName}
              onChange={(e) => set({ legalName: e.target.value })}
              placeholder="Empresa Ltda."
            />
          </label>
          <label>
            Nome fantasia
            <input
              value={client.tradeName}
              onChange={(e) => set({ tradeName: e.target.value })}
              placeholder="Nome comercial"
            />
          </label>
        </div>
        <div className="prop-form-row">
          <label>
            Tipo de documento
            <select
              value={client.documentType}
              onChange={(e) => set({ documentType: e.target.value })}
            >
              <option value="cnpj">CNPJ</option>
              <option value="cpf">CPF</option>
            </select>
          </label>
          <label>
            {client.documentType === 'cpf' ? 'CPF' : 'CNPJ'}
            <input
              value={client.document}
              onChange={(e) => set({ document: e.target.value })}
              placeholder={
                client.documentType === 'cpf'
                  ? '000.000.000-00'
                  : '00.000.000/0000-00'
              }
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="prop-card">
        <h3>Contato</h3>
        <div className="prop-form-row">
          <label>
            E-mail
            <input
              type="email"
              value={client.email}
              onChange={(e) => set({ email: e.target.value })}
            />
          </label>
          <label>
            Telefone
            <input
              value={client.phone}
              onChange={(e) => set({ phone: e.target.value })}
            />
          </label>
        </div>
        <label className="prop-full">
          WhatsApp
          <input
            value={client.whatsapp}
            onChange={(e) => set({ whatsapp: e.target.value })}
            placeholder="(11) 99999-9999"
          />
        </label>
      </fieldset>

      <fieldset className="prop-card">
        <h3>Endereço</h3>
        <div className="prop-form-row">
          <label>
            Logradouro
            <input
              value={client.street}
              onChange={(e) => set({ street: e.target.value })}
            />
          </label>
          <label>
            Número
            <input
              value={client.number}
              onChange={(e) => set({ number: e.target.value })}
            />
          </label>
        </div>
        <div className="prop-form-row">
          <label>
            Complemento
            <input
              value={client.complement}
              onChange={(e) => set({ complement: e.target.value })}
            />
          </label>
          <label>
            Bairro
            <input
              value={client.district}
              onChange={(e) => set({ district: e.target.value })}
            />
          </label>
        </div>
        <div className="prop-form-row prop-form-row--3">
          <label>
            Cidade
            <input
              value={client.city}
              onChange={(e) => set({ city: e.target.value })}
            />
          </label>
          <label>
            UF
            <select
              value={client.state}
              onChange={(e) => set({ state: e.target.value })}
            >
              <option value="">—</option>
              {BR_STATES.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </label>
          <label>
            CEP
            <input
              value={client.zip}
              onChange={(e) => set({ zip: e.target.value })}
              placeholder="00000-000"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="prop-card">
        <h3>Representante legal</h3>
        <div className="prop-form-row">
          <label>
            Nome
            <input
              value={client.legalRepName}
              onChange={(e) => set({ legalRepName: e.target.value })}
            />
          </label>
          <label>
            Cargo
            <input
              value={client.legalRepRole}
              onChange={(e) => set({ legalRepRole: e.target.value })}
              placeholder="Sócio, Diretor…"
            />
          </label>
        </div>
        <label className="prop-full">
          CPF do representante
          <input
            value={client.legalRepDocument}
            onChange={(e) => set({ legalRepDocument: e.target.value })}
          />
        </label>
      </fieldset>

      <fieldset className="prop-card">
        <h3>Observações internas</h3>
        <textarea
          rows={3}
          value={client.notes}
          onChange={(e) => set({ notes: e.target.value })}
        />
      </fieldset>
    </div>
  );
}
