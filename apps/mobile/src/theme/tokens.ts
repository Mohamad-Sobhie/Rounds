import type { SegmentKind } from '@rounds/core';

/**
 * Design tokens. Direction: gym scoreboard. Flat saturated phase colours, one condensed display
 * face for numbers and cues, the system font for everything else, no gradients or shadows.
 * Text colours on phase backgrounds are chosen for WCAG AA contrast (ratios noted below).
 */

const ink = '#111213';
const paper = '#F4F1EA';

export const colors = {
  ink,
  paper,
  background: '#0B0C0D',
  surface: '#16181A',
  line: '#2A2D30',
  muted: '#8A8F94',
  accent: '#FF4F1A',
} as const;

export interface PhaseColors {
  background: string;
  foreground: string;
  /** Track of the progress rings: the foreground at low opacity. */
  track: string;
}

export const phaseColors: Record<SegmentKind, PhaseColors> = {
  warmup: { background: '#F2A31B', foreground: ink, track: 'rgba(17,18,19,0.18)' }, // 8.96:1
  work: { background: '#FF4F1A', foreground: ink, track: 'rgba(17,18,19,0.18)' }, // 5.70:1
  rest: { background: '#0E6B66', foreground: paper, track: 'rgba(244,241,234,0.22)' }, // 5.62:1
  recovery: { background: '#24507A', foreground: paper, track: 'rgba(244,241,234,0.22)' }, // 7.44:1
  cooldown: { background: '#3F4A56', foreground: paper, track: 'rgba(244,241,234,0.22)' }, // 8.01:1
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
