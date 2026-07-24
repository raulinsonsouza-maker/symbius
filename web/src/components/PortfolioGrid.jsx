import { useState } from 'react';
import { PORTFOLIO_PROJECTS } from '../data/portfolio';
import { BRANDING_SECTION } from '../data/content';
import { RevealLine } from './RevealText';
import ProjectGalleryModal from './ProjectGalleryModal';

export default function PortfolioGrid() {
  const [activeProject, setActiveProject] = useState(null);

  return (
    <>
      <p className="section__label">{BRANDING_SECTION.label}</p>
      <RevealLine className="text-display branding__intro" as="h2" id="brandingIntro">
        {BRANDING_SECTION.intro}
      </RevealLine>
      <div className="marca__grid" id="marcaGrid">
        {PORTFOLIO_PROJECTS.map((project) => (
          <button
            key={project.id}
            type="button"
            className="marca__card"
            onClick={() => setActiveProject(project)}
            aria-label={`Abrir galeria do projeto ${project.name}`}
          >
            <img src={project.cover} alt={project.name} className="marca__card-image" loading="lazy" />
            <span className="marca__card-overlay" aria-hidden="true" />
            <span className="marca__card-label">{project.name}</span>
            <span className="marca__card-count">{project.images.length} imagens</span>
          </button>
        ))}
      </div>

      <ProjectGalleryModal project={activeProject} onClose={() => setActiveProject(null)} />
    </>
  );
}
