import { getStore } from '../store.js';
import { collectWebsite, normalizeUrl } from './collect.js';
import { emptyReport, generateReportWithGemini } from './gemini.js';
import { buildAnalysisSlug } from './slug.js';
import { customAlphabet } from 'nanoid';

const slugId = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8);
const running = new Set();

function defaultWhatsappMessage(clientName) {
  const name = clientName || 'sua empresa';
  return `Olá! Vi a Análise Estratégica elaborada pela Symbius para ${name} e gostaria de conversar sobre as oportunidades.`;
}

export async function createAndGenerateAnalysis({ websiteUrl, clientName }) {
  const store = getStore();
  const url = normalizeUrl(websiteUrl);
  const name = String(clientName || '').trim();
  const analysis = await store.createStrategicAnalysis({
    websiteUrl: url,
    clientName: name,
    publicSlug: buildAnalysisSlug(name, slugId()),
    status: 'generating',
    report: emptyReport(),
    sourceSnapshot: {},
    whatsappMessage: name ? defaultWhatsappMessage(name) : '',
  });

  queueMicrotask(() => {
    runGeneration(analysis.id).catch((err) => {
      console.error('strategic analysis generation failed', analysis.id, err);
    });
  });

  return analysis;
}

export async function regenerateAnalysis(id) {
  const store = getStore();
  const existing = await store.getStrategicAnalysis(id);
  if (!existing) return null;

  await store.updateStrategicAnalysis(id, {
    status: 'generating',
    errorMessage: '',
  });

  queueMicrotask(() => {
    runGeneration(id).catch((err) => {
      console.error('strategic analysis regenerate failed', id, err);
    });
  });

  return store.getStrategicAnalysis(id);
}

async function runGeneration(id) {
  if (running.has(id)) return;
  running.add(id);
  const store = getStore();

  try {
    const current = await store.getStrategicAnalysis(id);
    if (!current) return;

    const snapshot = await collectWebsite(current.websiteUrl);
    const clientName =
      String(current.clientName || '').trim() ||
      snapshot.suggestedClientName ||
      snapshot.hostname ||
      'Cliente';

    const report = await generateReportWithGemini({ clientName, snapshot });
    const whatsappMessage =
      current.whatsappMessage || defaultWhatsappMessage(clientName);

    await store.updateStrategicAnalysis(id, {
      clientName,
      websiteUrl: snapshot.websiteUrl,
      sourceSnapshot: {
        title: snapshot.title,
        description: snapshot.description,
        ogTitle: snapshot.ogTitle,
        ogSite: snapshot.ogSite,
        hostname: snapshot.hostname,
        socialLinks: snapshot.socialLinks,
        textPreview: String(snapshot.text || '').slice(0, 4000),
        collectedAt: snapshot.collectedAt,
      },
      report,
      whatsappMessage,
      status: 'ready',
      errorMessage: '',
    });
  } catch (err) {
    await store.updateStrategicAnalysis(id, {
      status: 'error',
      errorMessage: err.message || 'Falha na geração',
    });
  } finally {
    running.delete(id);
  }
}
