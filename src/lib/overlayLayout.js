/**
 * Where the scorebug sits on the OBS canvas, and how big it is.
 *
 * The scorebug is authored at true pixel size, which was implicitly a 1080p
 * assumption: the same 567px bug is 30% of the width at 1080p, 44% at 720p and
 * under 15% at 4K. Scaling the Browser Source inside OBS instead resamples the
 * render and softens the text, so the scale belongs here, in the page.
 *
 * Position was fixed at bottom-centre, which is not where most amateur sports
 * streams put a scorebug — top-left is at least as common.
 *
 * Every overlay consumes these as CSS custom properties, so the anchor lives in
 * one place rather than being restated in each sport.
 */

/** Distance from the canvas edge, matching the original bottom offset. */
const EDGE = '48px';

/**
 * @typedef {'top-left'|'top-center'|'top-right'|'middle-left'|'center'|'middle-right'|'bottom-left'|'bottom-center'|'bottom-right'} OverlayPosition
 */

/**
 * inset / translate / transform-origin for each anchor point.
 *
 * Corners use `translate(0)` rather than `none`. The overlays compose this with
 * a scale — `transform: <translate> scale(...)` — and `none` is not a transform
 * function, so `none scale(1.8)` is invalid and the browser drops the whole
 * declaration. Position still looked correct because that comes from `inset`,
 * which made the lost scale easy to miss.
 */
const POSITIONS = {
  'top-left':      { inset: `${EDGE} auto auto ${EDGE}`, translate: 'translate(0)',             origin: 'top left',     align: 'flex-start' },
  'top-center':    { inset: `${EDGE} auto auto 50%`,     translate: 'translateX(-50%)',         origin: 'top center',   align: 'center' },
  'top-right':     { inset: `${EDGE} ${EDGE} auto auto`, translate: 'translate(0)',             origin: 'top right',    align: 'flex-end' },
  'middle-left':   { inset: `50% auto auto ${EDGE}`,     translate: 'translateY(-50%)',         origin: 'center left',  align: 'flex-start' },
  'center':        { inset: '50% auto auto 50%',         translate: 'translate(-50%, -50%)',    origin: 'center',       align: 'center' },
  'middle-right':  { inset: `50% ${EDGE} auto auto`,     translate: 'translateY(-50%)',         origin: 'center right', align: 'flex-end' },
  'bottom-left':   { inset: `auto auto ${EDGE} ${EDGE}`, translate: 'translate(0)',             origin: 'bottom left',  align: 'flex-start' },
  'bottom-center': { inset: `auto auto ${EDGE} 50%`,     translate: 'translateX(-50%)',         origin: 'bottom center', align: 'center' },
  'bottom-right':  { inset: `auto ${EDGE} ${EDGE} auto`, translate: 'translate(0)',             origin: 'bottom right', align: 'flex-end' },
};

/**
 * Where a stat panel sits relative to the scorebug.
 *
 * Only two, and deliberately so. A broadcast graphic lives in a band along the
 * top or the bottom of frame, and a stat panel belongs in the same band as the
 * scorebug it relates to — stacked with it, not floated somewhere else on the
 * canvas. Giving the panel its own free anchor let the two be placed on top of
 * each other, and the score is the one thing that must never be covered.
 */
export const STATS_PLACEMENTS = ['above', 'below'];
export const DEFAULT_STATS_PLACEMENT = 'above';

export const OVERLAY_POSITIONS = Object.keys(POSITIONS);

export const DEFAULT_OVERLAY_POSITION = 'bottom-center';
export const DEFAULT_OVERLAY_SCALE = 1;

export const SCALE_MIN = 0.5;
export const SCALE_MAX = 2;

/** Human label for a position, for the picker's accessible name. */
export function positionLabel(position) {
  return position.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Build the inline style that drives an overlay's anchor.
 *
 * `--sb-align` lines the stack up with the edge it is anchored to: a bug in the
 * top-left corner with a panel above it should share a left edge, not be
 * centred on each other.
 *
 * @param {OverlayPosition} position
 * @param {number} scale
 * @returns {string} a style attribute value
 */
export function overlayAnchorStyle(position, scale) {
  const p = POSITIONS[position] ?? POSITIONS[DEFAULT_OVERLAY_POSITION];
  const s = clampScale(scale);
  return `--sb-inset: ${p.inset}; --sb-translate: ${p.translate}; --sb-origin: ${p.origin}; --sb-align: ${p.align}; --sb-scale: ${s};`;
}

/** Keep scale inside a range that stays legible and on-canvas. */
export function clampScale(scale) {
  const n = Number(scale);
  if (!Number.isFinite(n)) return DEFAULT_OVERLAY_SCALE;
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, n));
}
