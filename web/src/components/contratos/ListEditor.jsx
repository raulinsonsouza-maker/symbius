export default function ListEditor({ label, items, onChange, addLabel = '+ Item', multiline = false }) {
  const list = items || [];

  function update(index, value) {
    const next = [...list];
    next[index] = value;
    onChange(next);
  }

  function remove(index) {
    onChange(list.filter((_, i) => i !== index));
  }

  return (
    <section className="prop-card">
      <h3>{label}</h3>
      {list.map((item, index) => (
        <div key={index} className="prop-inline-form">
          {multiline ? (
            <textarea
              rows={2}
              value={item}
              onChange={(e) => update(index, e.target.value)}
            />
          ) : (
            <input value={item} onChange={(e) => update(index, e.target.value)} />
          )}
          <button
            type="button"
            className="prop-link"
            onClick={() => remove(index)}
          >
            Remover
          </button>
        </div>
      ))}
      <button
        type="button"
        className="lp-btn lp-btn--ghost lp-btn--sm"
        onClick={() => onChange([...list, ''])}
      >
        {addLabel}
      </button>
    </section>
  );
}
