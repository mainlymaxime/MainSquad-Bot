









import { createCanvas, loadImage } from '@napi-rs/canvas';
import { fileURLToPath } from 'node:url';

const template = fileURLToPath(new URL('../assets/tegeltje.png', import.meta.url));
const SIZE = 1248;

function wrap(ctx, text, width) {
  const lines = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/u)) {
      if (line && ctx.measureText(`${line} ${word}`).width > width) {
        lines.push(line); line = '';
      }
      if (ctx.measureText(word).width > width) {
        for (const char of Array.from(word)) {
          if (line && ctx.measureText(line + char).width > width) {
            lines.push(line); line = '';
          }
          line += char;
        }
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    lines.push(line);
  }
  return lines;
}

export async function createTegeltje({ quote, username, avatarURL }) {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  const background = await loadImage(template);
  ctx.drawImage(background, 0, 0, SIZE, SIZE);
  const response = await fetch(avatarURL, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Profielfoto ophalen mislukt');
  const avatar = await loadImage(Buffer.from(await response.arrayBuffer()));
  ctx.save();
  ctx.beginPath(); ctx.arc(624, 330, 130, 0, Math.PI * 2); ctx.clip();
  ctx.drawImage(avatar, 494, 200, 260, 260);
  ctx.restore();
  ctx.beginPath(); ctx.arc(624, 330, 133, 0, Math.PI * 2);
  ctx.strokeStyle = '#c27080'; ctx.lineWidth = 5; ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#713b49';
  const text = `“${quote.trim()}”`;
  let fontSize = 58; let lines;
  do {
    ctx.font = `${fontSize}px sans-serif`;
    lines = wrap(ctx, text, 750);
    if (lines.length * fontSize * 1.22 <= 390) break;
    fontSize--;
  } while (fontSize >= 12);
  if (fontSize < 12) throw new Error('Quote te lang voor tegeltje');
  const lineHeight = fontSize * 1.22;
  lines.forEach((line, i) => ctx.fillText(line, 624, 680 + (i - (lines.length - 1) / 2) * lineHeight));
  ctx.font = 'italic 38px sans-serif';
  ctx.fillText(`— ${username}`, 624, 955, 650);
  return canvas.toBuffer('image/png');
}




