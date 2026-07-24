import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../public/images/portfolio');
const outFile = path.resolve(__dirname, '../src/data/portfolio.js');

const names = {
  'canna-need': 'Canna Need',
  frates: 'Frates',
  frz: 'FRZ',
  lipido: 'Lípido',
  'mata-sede': 'Mata Sede',
  megatron: 'Megatron',
  tempervale: 'Tempervale',
  'van-nuffel': 'Van Nuffel',
};

const order = [
  'canna-need',
  'frates',
  'frz',
  'lipido',
  'mata-sede',
  'megatron',
  'tempervale',
  'van-nuffel',
];

const projects = order.map((slug) => {
  const dir = path.join(root, slug);
  const files = fs
    .readdirSync(dir)
    .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .sort((a, b) => {
      const aCapa = /^capa\./i.test(a) ? 0 : 1;
      const bCapa = /^capa\./i.test(b) ? 0 : 1;
      if (aCapa !== bCapa) return aCapa - bCapa;
      return a.localeCompare(b, undefined, { numeric: true });
    });

  const capaFile = files.find((f) => /^capa\./i.test(f)) || files[0];
  const images = files.map((f) => `/images/portfolio/${slug}/${f}`);

  return {
    id: slug,
    name: names[slug] || slug,
    cover: `/images/portfolio/${slug}/${capaFile}`,
    images,
  };
});

const content = `export const PORTFOLIO_PROJECTS = ${JSON.stringify(projects, null, 2)};\n`;

fs.writeFileSync(outFile, content, 'utf8');
console.log('Portfolio sincronizado:');
projects.forEach((p) => console.log(`- ${p.name}: ${p.cover}`));
