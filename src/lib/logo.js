/**
 * Team badges without a storage backend.
 *
 * Two ways in, because they suit different people:
 *
 *   Upload — the file is downscaled in the browser and carried inline in the
 *            scoreboard state as a data URL. Nothing is uploaded anywhere, and
 *            once it is in the state it is as reliable as the score itself.
 *            This is the recommended path.
 *
 *   Link   — an https URL to an image hosted elsewhere. Costs almost nothing in
 *            the broadcast payload, but the badge is only as dependable as
 *            whoever hosts it: if that server is down or blocks hotlinking at
 *            kickoff, the badge silently vanishes on air.
 *
 * SIZE DISCIPLINE
 *   State is re-broadcast on a 5-second heartbeat and mirrored to every overlay
 *   and paired phone, so a badge is not a free passenger. Uploads are downscaled
 *   to MAX_EDGE and rejected past MAX_BYTES rather than being allowed to bloat
 *   every message for the rest of the match.
 */

/** Badges render small; anything larger is wasted bytes on every broadcast. */
const MAX_EDGE = 96;

/** Hard ceiling on the encoded badge, well inside realtime message limits. */
const MAX_BYTES = 40 * 1024;

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];

/**
 * Read an image file and return a downscaled data URL.
 *
 * @param {File} file
 * @returns {Promise<string>} data URL
 * @throws {Error} with a message suitable for showing to the operator
 */
export async function fileToBadge(file) {
  if (!file) throw new Error('No file selected.');
  if (!ACCEPTED.includes(file.type)) {
    throw new Error('That file type is not supported. Use PNG, JPEG, WebP, GIF or SVG.');
  }

  const source = await loadImage(await readAsDataUrl(file));

  const scale = Math.min(1, MAX_EDGE / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  // Transparency matters — badges sit over live video.
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);

  // WebP is markedly smaller at this size; PNG keeps older renderers working.
  let out = canvas.toDataURL('image/webp', 0.92);
  if (!out.startsWith('data:image/webp')) out = canvas.toDataURL('image/png');

  if (byteLength(out) > MAX_BYTES) {
    out = canvas.toDataURL('image/webp', 0.7);
  }
  if (byteLength(out) > MAX_BYTES) {
    throw new Error('That image is too detailed to embed. Try a simpler badge, or link to a URL instead.');
  }

  return out;
}

/**
 * Validate a link to an externally hosted badge.
 *
 * @param {string} raw
 * @returns {string} the normalised URL
 * @throws {Error} with a message suitable for showing to the operator
 */
export function validateBadgeUrl(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) throw new Error('Paste an image URL.');

  let url;
  try {
    url = new URL(trimmed);
  } catch (_) {
    throw new Error("That doesn't look like a URL.");
  }

  // The app is served over https, so an http image is blocked as mixed content
  // and would simply never appear — better to say so than to fail silently.
  if (url.protocol !== 'https:') {
    throw new Error('The link must start with https:// or it will be blocked from loading.');
  }

  return url.href;
}

/** Approximate encoded size of a data URL, in bytes. */
export function byteLength(dataUrl) {
  const comma = dataUrl.indexOf(',');
  if (comma === -1) return dataUrl.length;
  const body = dataUrl.slice(comma + 1);
  // base64 encodes 3 bytes per 4 characters
  return Math.round((body.length * 3) / 4);
}

/** Human-readable size, for showing what a badge costs. */
export function formatBytes(bytes) {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That file could not be read as an image.'));
    img.src = src;
  });
}
