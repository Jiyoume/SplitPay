/**
 * MyShare design tokens — single source of truth for the redesign.
 * Derived from the 2026-07-16 design references (docs/REDESIGN_SPEC.md).
 */

export const Palette = {
  background: '#F2F5F9',
  card: '#FFFFFF',
  textPrimary: '#101828',
  textSecondary: '#667085',
  textMuted: '#98A2B3',
  accent: '#2F6BFF',
  gradientStart: '#4A5CFB',
  gradientEnd: '#21D4E8',
  positive: '#16A34A',
  positiveBg: '#E8F9EF',
  negative: '#EF4444',
  negativeBg: '#FEECEC',
  pending: '#F59E0B',
  pendingBg: '#FEF4E6',
  border: '#E4E9F0',
  navy: '#0F1B3D',
  white: '#FFFFFF',
};

export const Radii = {
  card: 16,
  input: 12,
  button: 14,
  pill: 999,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const CardShadow = {
  shadowColor: '#101828',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

export const Gradient = {
  primary: ['#4A5CFB', '#21D4E8'] as const,
  start: { x: 0, y: 0.5 },
  end: { x: 1, y: 0.5 },
};

/** Peso formatter: peso(1245.5) → "₱1,245.50" */
export function peso(amount: number, opts: { sign?: boolean } = {}): string {
  const sign = opts.sign ? (amount > 0 ? '+' : amount < 0 ? '-' : '') : amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  return `${sign}₱${abs.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
