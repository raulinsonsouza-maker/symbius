import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import { buildLegalContractDocument } from './contractLegal.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const signedDir = path.join(__dirname, '../../data/signed');

function ensureDir() {
  if (!fs.existsSync(signedDir)) {
    fs.mkdirSync(signedDir, { recursive: true });
  }
}

function pageBottom(doc) {
  return doc.page.height - doc.page.margins.bottom;
}

function ensureSpace(doc, needed = 72) {
  if (doc.y + needed > pageBottom(doc)) {
    doc.addPage();
  }
}

function writeParagraph(doc, text, opts = {}) {
  const width = opts.width ?? 495;
  ensureSpace(doc, 36);
  doc
    .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(opts.size ?? 9.5)
    .fillColor(opts.color ?? '#222')
    .text(text, {
      width,
      align: opts.align || 'justify',
      lineGap: 1.5,
    });
  doc.moveDown(opts.after ?? 0.35);
}

function writeBlocks(doc, blocks) {
  for (const block of blocks || []) {
    if (block.type === 'ul') {
      for (const item of block.items || []) {
        ensureSpace(doc, 28);
        doc
          .font('Helvetica')
          .fontSize(9.5)
          .fillColor('#222')
          .text(`•  ${item}`, {
            width: 480,
            align: 'left',
            indent: 8,
            lineGap: 1.2,
          });
        doc.moveDown(0.2);
      }
      doc.moveDown(0.25);
      continue;
    }

    if (block.type === 'table' && block.table) {
      ensureSpace(doc, 50);
      const headers = block.table.headers || [];
      const colW = 495 / Math.max(headers.length, 1);
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#555');
      let x = doc.page.margins.left;
      const y = doc.y;
      headers.forEach((h, i) => {
        doc.text(h, x + i * colW, y, { width: colW - 6, align: 'left' });
      });
      doc.moveDown(0.4);
      doc
        .moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.margins.left + 495, doc.y)
        .strokeColor('#ddd')
        .stroke();
      doc.moveDown(0.3);
      for (const row of block.table.rows || []) {
        ensureSpace(doc, 24);
        const rowY = doc.y;
        doc.font('Helvetica').fontSize(9).fillColor('#222');
        row.forEach((cell, i) => {
          doc.text(String(cell), doc.page.margins.left + i * colW, rowY, {
            width: colW - 6,
            align: 'left',
          });
        });
        doc.moveDown(0.35);
      }
      doc.moveDown(0.35);
      continue;
    }

    if (block.text) {
      writeParagraph(doc, block.text);
    }
  }
}

function writePartyBox(doc, party, x, width) {
  const startY = doc.y;
  doc.font('Helvetica').fontSize(8).fillColor('#888').text(party.label, x, startY, {
    width,
  });
  let y = startY + 12;
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#111').text(party.name || '—', x, y, {
    width,
  });
  y = doc.y + 2;
  doc.font('Helvetica').fontSize(8.5).fillColor('#444');
  if (party.document) {
    doc.text(party.document, x, y, { width });
    y = doc.y + 1;
  }
  if (party.address) {
    doc.text(party.address, x, y, { width });
    y = doc.y + 1;
  }
  if (party.rep) {
    doc.text(`Representante: ${party.rep}`, x, y, { width });
    y = doc.y + 1;
  }
  if (party.repDoc) {
    doc.text(party.repDoc, x, y, { width });
    y = doc.y + 1;
  }
  if (party.brandNote) {
    doc.fillColor('#666').text(party.brandNote, x, y, { width });
    y = doc.y + 1;
  }
  return y;
}

/**
 * Builds a signed contract PDF (full legal instrument + evidence) and writes it under api/data/signed/.
 * @returns {{ absolutePath: string, relativePath: string, buffer: Buffer }}
 */
export async function generateSignedContractPdf({
  contract,
  client,
  settings,
  signature,
}) {
  ensureDir();
  const filename = `${contract.id}.pdf`;
  const absolutePath = path.join(signedDir, filename);
  const relativePath = path.join('signed', filename);

  const legal = buildLegalContractDocument(contract, settings, client);
  const company =
    settings?.legalName || settings?.companyName || 'Symbius';

  const doc = new PDFDocument({
    margin: 50,
    size: 'A4',
    info: {
      Title: `Contrato ${contract.number || ''}`.trim(),
      Author: company,
    },
  });

  const chunks = [];
  doc.on('data', (c) => chunks.push(c));

  const done = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  // Header
  const headerTop = doc.y;
  doc.font('Helvetica').fontSize(9).fillColor('#888').text(company.toUpperCase(), {
    width: 240,
  });
  if (legal.projectLine) {
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#888')
      .text(legal.projectLine, 300, headerTop, {
        width: 245,
        align: 'right',
      });
  }
  doc.y = Math.max(doc.y, headerTop + 14);
  doc.moveDown(0.7);

  doc
    .font('Helvetica-Bold')
    .fontSize(13)
    .fillColor('#111')
    .text(legal.title, { align: 'left', width: 495 });
  doc.moveDown(0.25);
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#555')
    .text(legal.subtitle, { width: 495 });
  doc.moveDown(0.9);

  // Parties
  const leftX = doc.page.margins.left;
  const colW = 235;
  const gap = 25;
  const partiesY = doc.y;
  doc.y = partiesY;
  const y1 = writePartyBox(doc, legal.provider, leftX, colW);
  doc.y = partiesY;
  const y2 = writePartyBox(doc, legal.clientParty, leftX + colW + gap, colW);
  doc.y = Math.max(y1, y2) + 10;
  doc.moveDown(0.4);

  writeParagraph(doc, legal.preamble, { after: 0.6 });

  // Clauses
  for (const clause of legal.clauses) {
    ensureSpace(doc, 56);
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#111')
      .text(clause.title, { width: 495 });
    doc.moveDown(0.35);
    writeBlocks(doc, clause.blocks);
    doc.moveDown(0.35);
  }

  // Closing
  ensureSpace(doc, 80);
  writeParagraph(doc, legal.closing.agreement);
  writeParagraph(doc, legal.closing.placeDate, { after: 0.8 });

  ensureSpace(doc, 120);
  const signY = doc.y;
  const rightX = leftX + colW + gap;

  function writeSignColumn(x, lines) {
    let y = signY;
    for (const line of lines) {
      doc
        .font(line.bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(line.size || 8)
        .fillColor(line.color || '#555')
        .text(line.text, x, y, { width: colW, align: 'left' });
      y = doc.y + (line.gap ?? 2);
    }
    return y;
  }

  const providerLines = [
    { text: legal.closing.providerSignName, bold: true, size: 9, color: '#111', gap: 3 },
    { text: legal.closing.providerSignRole, size: 8, color: '#555', gap: 2 },
    { text: legal.closing.providerSignPerson, size: 8, color: '#555', gap: 6 },
  ];
  if (signature.providerSignedAt || signature.providerSignerName) {
    providerLines.push({
      text: 'Assinado eletronicamente',
      size: 7.5,
      color: '#2e7d4f',
      gap: 2,
    });
    providerLines.push({
      text: signature.providerSignerName || legal.closing.providerSignPerson,
      size: 8,
      color: '#111',
      gap: 2,
    });
    if (signature.providerSignerEmail) {
      providerLines.push({
        text: signature.providerSignerEmail,
        size: 7.5,
        color: '#666',
        gap: 2,
      });
    }
    providerLines.push({
      text: signature.providerSignedAt
        ? new Date(signature.providerSignedAt).toLocaleString('pt-BR')
        : '—',
      size: 7.5,
      color: '#666',
      gap: 2,
    });
  }

  const clientLines = [
    { text: legal.closing.clientSignName, bold: true, size: 9, color: '#111', gap: 3 },
    { text: legal.closing.clientSignRole, size: 8, color: '#555', gap: 2 },
    { text: legal.closing.clientSignPerson, size: 8, color: '#555', gap: 6 },
  ];
  if (signature.signedAt || signature.signerName) {
    clientLines.push({
      text: 'Assinado eletronicamente',
      size: 7.5,
      color: '#2e7d4f',
      gap: 2,
    });
    clientLines.push({
      text: signature.signerName || legal.closing.clientSignPerson,
      size: 8,
      color: '#111',
      gap: 2,
    });
    if (signature.signerEmail) {
      clientLines.push({
        text: signature.signerEmail,
        size: 7.5,
        color: '#666',
        gap: 2,
      });
    }
    clientLines.push({
      text: signature.signedAt
        ? new Date(signature.signedAt).toLocaleString('pt-BR')
        : '—',
      size: 7.5,
      color: '#666',
      gap: 2,
    });
  }

  const yLeft = writeSignColumn(leftX, providerLines);
  const yRight = writeSignColumn(rightX, clientLines);
  doc.y = Math.max(yLeft, yRight, signY + 70) + 16;

  // Signature evidence page
  doc.addPage();
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#111').text('Evidência de assinatura eletrônica');
  doc.moveDown(0.5);
  writeParagraph(
    doc,
    'Este documento registra as assinaturas eletrônicas simples do contrato (CONTRATADA e CONTRATANTE), com identificação dos signatários, carimbo temporal e hash de integridade do conteúdo.',
    { align: 'left', after: 0.7 },
  );

  function writeEvidenceSection(title, rows) {
    ensureSpace(doc, 48);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#111').text(title);
    doc.moveDown(0.35);
    for (const [label, value] of rows) {
      ensureSpace(doc, 32);
      doc.font('Helvetica').fontSize(8).fillColor('#888').text(label);
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#111')
        .text(String(value || '—'), { width: 495 });
      doc.moveDown(0.35);
    }
    doc.moveDown(0.5);
  }

  writeEvidenceSection('CONTRATADA', [
    ['Representante', signature.providerSignerName || legal.closing.providerSignPerson || '—'],
    ['E-mail', signature.providerSignerEmail || '—'],
    ['Documento', signature.providerSignerDocument || '—'],
    [
      'Data/hora',
      signature.providerSignedAt
        ? new Date(signature.providerSignedAt).toLocaleString('pt-BR')
        : '—',
    ],
  ]);

  writeEvidenceSection('CONTRATANTE', [
    ['Signatário', signature.signerName || '—'],
    ['E-mail', signature.signerEmail || '—'],
    ['Documento', signature.signerDocument || '—'],
    [
      'Data/hora',
      signature.signedAt
        ? new Date(signature.signedAt).toLocaleString('pt-BR')
        : '—',
    ],
    ['IP', signature.signerIp || '—'],
    ['User-Agent', signature.signerUserAgent || '—'],
  ]);

  writeEvidenceSection('Integridade', [
    ['Hash SHA-256', signature.contentHash || '—'],
    ['Contrato', contract.number || contract.id],
  ]);

  doc.moveDown(0.4);
  writeParagraph(
    doc,
    'Assinaturas eletrônicas realizadas no sistema Symbius (Lei 14.063/2020). O conteúdo deste PDF corresponde ao instrumento particular de prestação de serviços aceito pelas Partes.',
    { align: 'left', size: 8.5, color: '#666' },
  );

  doc.end();
  const buffer = await done;
  fs.writeFileSync(absolutePath, buffer);

  return { absolutePath, relativePath, buffer };
}

export function resolveSignedPdfAbsolute(relativePath) {
  if (!relativePath) return null;
  const abs = path.isAbsolute(relativePath)
    ? relativePath
    : path.join(__dirname, '../../data', relativePath);
  return fs.existsSync(abs) ? abs : null;
}

/** Rebuild PDF for an already-signed contract (keeps evidence fields from DB). */
export async function regenerateSignedContractPdf({
  contract,
  client,
  settings,
}) {
  return generateSignedContractPdf({
    contract,
    client,
    settings,
    signature: {
      signerName: contract.signerName,
      signerEmail: contract.signerEmail,
      signerDocument: contract.signerDocument,
      signedAt: contract.signedAt,
      signerIp: contract.signerIp,
      signerUserAgent: contract.signerUserAgent,
      contentHash: contract.contentHash,
      providerSignedAt: contract.providerSignedAt,
      providerSignerName: contract.providerSignerName,
      providerSignerEmail: contract.providerSignerEmail,
      providerSignerDocument: contract.providerSignerDocument,
    },
  });
}
