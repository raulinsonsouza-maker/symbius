import { getStore } from '../store.js';
import { collectWebsite } from './collect.js';
import { buildAnalysisSlug } from './slug.js';
import { buildExportPrompt, parseChannels, pickWebsiteUrl } from './prompt.js';
import {
  emptyReport,
  extractJsonFromAiText,
  normalizeReport,
} from './report.js';
import { customAlphabet } from 'nanoid';

const slugId = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8);

function defaultWhatsappMessage(clientName) {
  const name = clientName || 'sua empresa';
  return `Olá! Vi a Análise Estratégica elaborada pela Symbius para ${name} e gostaria de conversar sobre as oportunidades.`;
}

export async function createAndPrepareAnalysis({ clientName, channels }) {
  const store = getStore();
  const name = String(clientName || '').trim();
  const channelList = parseChannels(channels);
  if (channelList.length === 0) {
    throw Object.assign(
      new Error('Informe pelo menos um canal (site, Instagram, etc.)'),
      { status: 400 },
    );
  }

  const websiteUrl = pickWebsiteUrl(channelList);
  let snapshot = null;
  if (websiteUrl) {
    try {
      snapshot = await collectWebsite(websiteUrl);
    } catch {
      snapshot = null;
    }
  }

  const resolvedName =
    name ||
    snapshot?.suggestedClientName ||
    snapshot?.hostname ||
    'Cliente';

  const exportPrompt = buildExportPrompt({
    clientName: resolvedName,
    channels: channelList,
    snapshot,
  });

  const sourceSnapshot = {
    channels: channelList,
    exportPrompt,
    title: snapshot?.title || '',
    description: snapshot?.description || '',
    ogTitle: snapshot?.ogTitle || '',
    ogSite: snapshot?.ogSite || '',
    hostname: snapshot?.hostname || '',
    socialLinks: snapshot?.socialLinks || {},
    textPreview: String(snapshot?.text || '').slice(0, 4000),
    collectedAt: snapshot?.collectedAt || null,
    collectFailed: !snapshot,
  };

  return store.createStrategicAnalysis({
    websiteUrl: snapshot?.websiteUrl || websiteUrl || channelList[0],
    clientName: resolvedName,
    publicSlug: buildAnalysisSlug(resolvedName, slugId()),
    status: 'awaiting_import',
    report: emptyReport(),
    sourceSnapshot,
    whatsappMessage: defaultWhatsappMessage(resolvedName),
    errorMessage: '',
  });
}

export async function importAnalysisFromAiText(id, rawText) {
  const store = getStore();
  const existing = await store.getStrategicAnalysis(id);
  if (!existing) return null;

  try {
    const parsed = extractJsonFromAiText(rawText);
    const report = normalizeReport(parsed, existing.clientName);
    return store.updateStrategicAnalysis(id, {
      report,
      status: 'ready',
      errorMessage: '',
    });
  } catch (err) {
    await store.updateStrategicAnalysis(id, {
      status: 'error',
      errorMessage: err.message || 'Falha ao importar saída do GPT',
    });
    throw err;
  }
}
