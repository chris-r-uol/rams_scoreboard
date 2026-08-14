/**
 * Overlay anchoring.
 *
 * The composability test is the important one. Corners originally emitted
 * `translate: none`, and the overlays compose translate with scale in a single
 * declaration — `none scale(1.8)` is invalid CSS, so the browser dropped the
 * whole transform and scaling silently did nothing at four of the nine
 * positions. Position still looked right because that comes from `inset`, which
 * is exactly what made it easy to miss.
 */
import { describe, it, expect } from 'vitest';
import {
  OVERLAY_POSITIONS, overlayAnchorStyle, clampScale, positionLabel,
  SCALE_MIN, SCALE_MAX, DEFAULT_OVERLAY_POSITION, DEFAULT_OVERLAY_SCALE,
} from './overlayLayout.js';

/** Pull a custom property out of the generated style string. */
function readVar(style, name) {
  return style.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]?.trim();
}

describe('overlayAnchorStyle', () => {
  it('covers all nine anchor points', () => {
    expect(OVERLAY_POSITIONS).toHaveLength(9);
  });

  it.each(OVERLAY_POSITIONS)('produces a scale-composable transform at %s', (position) => {
    const translate = readVar(overlayAnchorStyle(position, 1.8), '--sb-translate');

    // `none` cannot be combined with another transform function. Anything that
    // is not a function call would invalidate `<translate> scale(...)`.
    expect(translate).not.toBe('none');
    expect(translate).toMatch(/^(translate|translateX|translateY)\(/);
  });

  it.each(OVERLAY_POSITIONS)('sets inset and origin at %s', (position) => {
    const style = overlayAnchorStyle(position, 1);
    expect(readVar(style, '--sb-inset')).toBeTruthy();
    expect(readVar(style, '--sb-origin')).toBeTruthy();
  });

  it('reproduces the original bottom-centre geometry by default', () => {
    // Existing OBS setups must be untouched by the introduction of placement.
    const style = overlayAnchorStyle(DEFAULT_OVERLAY_POSITION, DEFAULT_OVERLAY_SCALE);
    expect(readVar(style, '--sb-inset')).toBe('auto auto 48px 50%');
    expect(readVar(style, '--sb-translate')).toBe('translateX(-50%)');
    expect(readVar(style, '--sb-scale')).toBe('1');
  });

  it('anchors each corner to its own two edges', () => {
    expect(readVar(overlayAnchorStyle('top-left', 1), '--sb-inset')).toBe('48px auto auto 48px');
    expect(readVar(overlayAnchorStyle('bottom-right', 1), '--sb-inset')).toBe('auto 48px 48px auto');
  });

  it('scales from the anchored corner, so the bug grows inward not off-canvas', () => {
    expect(readVar(overlayAnchorStyle('top-left', 2), '--sb-origin')).toBe('top left');
    expect(readVar(overlayAnchorStyle('bottom-right', 2), '--sb-origin')).toBe('bottom right');
  });

  it('falls back to the default for an unknown position', () => {
    const unknown = overlayAnchorStyle('nowhere', 1);
    expect(unknown).toBe(overlayAnchorStyle(DEFAULT_OVERLAY_POSITION, 1));
  });

  it('carries the scale through', () => {
    expect(readVar(overlayAnchorStyle('center', 1.35), '--sb-scale')).toBe('1.35');
  });
});

describe('clampScale', () => {
  it('keeps the bug within a legible, on-canvas range', () => {
    expect(clampScale(99)).toBe(SCALE_MAX);
    expect(clampScale(0.01)).toBe(SCALE_MIN);
  });

  it('passes sensible values through', () => {
    expect(clampScale(1.35)).toBe(1.35);
  });

  it('accepts the string a range input produces', () => {
    expect(clampScale('1.5')).toBe(1.5);
  });

  it('falls back to 1 rather than NaN, which would erase the overlay', () => {
    expect(clampScale('banana')).toBe(DEFAULT_OVERLAY_SCALE);
    expect(clampScale(undefined)).toBe(DEFAULT_OVERLAY_SCALE);
    // Non-finite input is a bug upstream, not a request for maximum size.
    expect(clampScale(Infinity)).toBe(DEFAULT_OVERLAY_SCALE);
  });
});

describe('positionLabel', () => {
  it('reads as words for the accessible name', () => {
    expect(positionLabel('bottom-right')).toBe('Bottom Right');
    expect(positionLabel('center')).toBe('Center');
  });
});
