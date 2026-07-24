export function RevealWords({ children, className = '', id }) {
  const text = children.replace(/\s+/g, ' ').trim();
  const words = text.split(' ');

  return (
    <p className={className} id={id}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          className={`reveal-word${i === words.length - 1 ? ' reveal-word--last' : ''}`}
        >
          <span className="reveal-word__inner">{word}</span>
        </span>
      ))}
    </p>
  );
}

export function RevealLine({ children, className = '', id, as: Tag = 'p' }) {
  const text = typeof children === 'string' ? children.replace(/\s+/g, ' ').trim() : children;

  return (
    <Tag className={className} id={id}>
      <span className="reveal-line">
        <span className="reveal-line__inner">{text}</span>
      </span>
    </Tag>
  );
}
