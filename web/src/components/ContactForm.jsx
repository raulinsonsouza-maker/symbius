import { useState } from 'react';
import { whatsappUrl, WHATSAPP_DEFAULT_MESSAGE } from '../lib/whatsapp';

export default function ContactForm() {
  const [status, setStatus] = useState('idle');
  const [form, setForm] = useState({
    nome: '',
    empresa: '',
    contato: '',
    mensagem: '',
  });

  const onChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  if (status === 'success') {
    return (
      <div className="lp-form lp-form--done">
        <h3>Recebemos seu contato.</h3>
        <p>
          Em breve nosso time vai falar com você para desenhar seu plano de
          crescimento.
        </p>
        <a
          className="lp-btn lp-btn--ghost"
          href={whatsappUrl()}
          target="_blank"
          rel="noreferrer"
        >
          Falar agora no WhatsApp
        </a>
      </div>
    );
  }

  return (
    <form
      className="lp-form"
      onSubmit={(event) => {
        event.preventDefault();
        const message = `${WHATSAPP_DEFAULT_MESSAGE}\n\nNome: ${form.nome}\nEmpresa: ${form.empresa}\nContato: ${form.contato}\nMensagem: ${form.mensagem}`;
        window.open(whatsappUrl(message), '_blank', 'noopener');
        setStatus('success');
      }}
    >
      <div className="lp-form__row">
        <label className="lp-field">
          <span>Nome</span>
          <input
            required
            type="text"
            value={form.nome}
            onChange={onChange('nome')}
            placeholder="Seu nome"
          />
        </label>
        <label className="lp-field">
          <span>Empresa</span>
          <input
            type="text"
            value={form.empresa}
            onChange={onChange('empresa')}
            placeholder="Nome da empresa"
          />
        </label>
      </div>
      <label className="lp-field">
        <span>WhatsApp ou e-mail</span>
        <input
          required
          type="text"
          value={form.contato}
          onChange={onChange('contato')}
          placeholder="Como falamos com você"
        />
      </label>
      <label className="lp-field">
        <span>O que você quer resolver?</span>
        <textarea
          rows={3}
          value={form.mensagem}
          onChange={onChange('mensagem')}
          placeholder="Ex.: quero mais clientes qualificados todos os meses"
        />
      </label>
      {status === 'error' && (
        <p className="lp-form__error">
          Não foi possível enviar. Tente novamente ou fale no WhatsApp.
        </p>
      )}
      <button
        type="submit"
        className="lp-btn lp-btn--solid"
        disabled={status === 'sending'}
      >
        {status === 'sending' ? 'Enviando...' : 'Quero captar mais clientes'}
      </button>
      <p className="lp-form__note">Resposta rápida. Sem compromisso.</p>
    </form>
  );
}
