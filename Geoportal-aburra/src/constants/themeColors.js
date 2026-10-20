export const THEME_COLORS = {
  brandDark: '#14301F',
  brand: '#16A34A',
  brandLight: '#7FE0A8',
  accent: '#7C3AED',
  gym: '#2563EB',
  outdoor: '#F59E0B',
  center: '#DB2777',
  star: '#FBBF24',
  white: '#FFFFFF',
  textPrimary: '#F0FDF4',
  muted: '#64748B',
};

export function colorWithAlpha(color, alpha) {
  const hex = color.replace('#', '');
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
