// Maps a theme_color value (preset name OR hex string) to [primary, light] hex pair.
// The layout injects these as --gold / --gold-light overrides so the entire
// site re-colors without any component changes.

export const THEME_PRESETS: Record<string, { primary: string; light: string; label: string; emoji: string }> = {
  gold:   { primary: '#d4a520', light: '#f0c842', label: 'Gold',   emoji: '🟡' },
  blue:   { primary: '#3b82f6', light: '#60a5fa', label: 'Blue',   emoji: '🔵' },
  purple: { primary: '#8b5cf6', light: '#a78bfa', label: 'Purple', emoji: '🟣' },
  rose:   { primary: '#e11d48', light: '#fb7185', label: 'Rose',   emoji: '🌸' },
  green:  { primary: '#22c55e', light: '#4ade80', label: 'Green',  emoji: '🟢' },
  cyan:   { primary: '#06b6d4', light: '#22d3ee', label: 'Cyan',   emoji: '🩵' },
  orange: { primary: '#f97316', light: '#fb923c', label: 'Orange', emoji: '🟠' },
  pink:   { primary: '#ec4899', light: '#f472b6', label: 'Pink',   emoji: '🩷' },
}

export function resolveThemeColor(themeColor: string): { primary: string; light: string } {
  if (!themeColor) return THEME_PRESETS.gold
  // Named preset
  if (THEME_PRESETS[themeColor]) return THEME_PRESETS[themeColor]
  // Raw hex — generate a lighter variant by mixing with white
  if (themeColor.startsWith('#')) {
    return { primary: themeColor, light: lightenHex(themeColor, 0.3) }
  }
  return THEME_PRESETS.gold
}

// Simple hex lightener — mixes color with white at the given ratio (0–1)
function lightenHex(hex: string, ratio: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lr = Math.round(r + (255 - r) * ratio)
  const lg = Math.round(g + (255 - g) * ratio)
  const lb = Math.round(b + (255 - b) * ratio)
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`
}
