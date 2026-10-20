import type { SegmentKind } from '@rounds/core';

/**
 * Design tokens. Direction: white canvas. The app is always white; each phase owns one accent
 * colour used for the step label, the phase name, the rings and the primary control. One condensed
 * display face for numbers and cues, the system font for everything else, no gradients or shadows.
 * Contrast ratios against white are noted (WCAG AA is 4.5:1).
 */

export const colors = {
  background: '#FFFFFF',
  surface: '#F6F5F2',
  ink: '#1B1D1F', // 16.9:1
  muted: '#6B6F73', // 5.1:1
  line: '#E8E6E1',
  /** Unfilled part of the progress rings. */
  track: '#EFEDE8',
} as const;

export const phaseColors: Record<SegmentKind, string> = {
  warmup: '#A85E08', // amber, 4.9:1
  work: '#CC4118', // vermilion, 4.8:1
  rest: '#0C846D', // teal, 4.6:1
  recovery: '#2A64C8', // blue, 5.6:1
  cooldown: '#6A55C2', // violet, 5.7:1
};

export const fonts = {
  /** Countdown and big numbers. */
  displayHeavy: 'BigShouldersDisplay_800ExtraBold',
  /** Step labels and headings. */
  display: 'BigShouldersDisplay_700Bold',
} as const;

export const space = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  s: 2,
  m: 4,
} as const;
