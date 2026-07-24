import { SECTION_LABELS } from '../data/content';

export default function SectionNav({ activeSection }) {
  const handleClick = (index) => {
    window.symbiusScrollToSection?.(index);
  };

  return (
    <nav className="section-nav" aria-label="Navegação por seções">
      {SECTION_LABELS.map((label, index) => (
        <button
          key={label}
          type="button"
          className={`section-nav__dot${activeSection === index ? ' is-active' : ''}`}
          data-section={index}
          aria-label={label}
          onClick={() => handleClick(index)}
        />
      ))}
    </nav>
  );
}
