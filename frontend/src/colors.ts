export interface ColorOption {
  name: string    // Norwegian display name + DB stored value
  nameEn: string  // English display name
  hex: string
}

// Nature tones first, then all common colors
export const COLORS: ColorOption[] = [
  // Hvite / kremtoner
  { name: 'Hvit',      nameEn: 'White',       hex: '#FFFFFF' },
  { name: 'Kremhvit',  nameEn: 'Cream White', hex: '#FFF8F0' },
  { name: 'Elfenben',  nameEn: 'Ivory',       hex: '#FFFFF0' },
  { name: 'Perle',     nameEn: 'Pearl',       hex: '#F5F0EA' },

  // Beige / brun / nøytral
  { name: 'Beige',         nameEn: 'Beige',          hex: '#F5F5DC' },
  { name: 'Kald beige',    nameEn: 'Cool Beige',     hex: '#E8E0D5' },
  { name: 'Lin',           nameEn: 'Linen',          hex: '#DDD5C8' },
  { name: 'Taupe',         nameEn: 'Taupe',          hex: '#C9BFB3' },
  { name: 'Naturull',      nameEn: 'Natural Wool',   hex: '#D6CFC4' },
  { name: 'Ørkensten',     nameEn: 'Desert Rock',    hex: '#A48D78' },
  { name: 'Myk sandstein', nameEn: 'Soft Sandstone', hex: '#CBB9A4' },
  { name: 'Kremhavre',     nameEn: 'Creamed Oat',    hex: '#E6DAC8' },
  { name: 'Sand',          nameEn: 'Sand',           hex: '#C2B280' },
  { name: 'Kamel',         nameEn: 'Camel',          hex: '#C19A6B' },
  { name: 'Lys brun',      nameEn: 'Light Brown',    hex: '#DEB887' },
  { name: 'Brun',          nameEn: 'Brown',          hex: '#8B4513' },
  { name: 'Mørkebrun',     nameEn: 'Dark Brown',     hex: '#4A2C0A' },
  { name: 'Terrakotta',    nameEn: 'Terracotta',     hex: '#CC4E2A' },

  // Grå / sort
  { name: 'Lysegrå',  nameEn: 'Light Grey', hex: '#D3D3D3' },
  { name: 'Grå',      nameEn: 'Grey',       hex: '#9E9E9E' },
  { name: 'Mørkegrå', nameEn: 'Dark Grey',  hex: '#616161' },
  { name: 'Sort',     nameEn: 'Black',      hex: '#212121' },

  // Blå
  { name: 'Himmelblå', nameEn: 'Sky Blue',    hex: '#87CEEB' },
  { name: 'Lyseblå',   nameEn: 'Light Blue',  hex: '#ADD8E6' },
  { name: 'Klar blå',  nameEn: 'Bright Blue', hex: '#0066CC' },
  { name: 'Kongeblå',  nameEn: 'Royal Blue',  hex: '#4169E1' },
  { name: 'Gråblå',    nameEn: 'Slate Blue',  hex: '#708090' },
  { name: 'Navy',      nameEn: 'Navy',        hex: '#001F5B' },
  { name: 'Petrol',    nameEn: 'Petrol',      hex: '#005F73' },
  { name: 'Turkis',    nameEn: 'Turquoise',   hex: '#40E0D0' },

  // Grønn
  { name: 'Mint',       nameEn: 'Mint',         hex: '#A8D8A8' },
  { name: 'Lysegrønn',  nameEn: 'Light Green',  hex: '#90EE90' },
  { name: 'Sage grønn', nameEn: 'Sage Green',   hex: '#9B9B7A' },
  { name: 'Grågrønn',   nameEn: 'Grey Green',   hex: '#5F7A61' },
  { name: 'Mose grønn', nameEn: 'Moss Green',   hex: '#8A9A5B' },
  { name: 'Grønn',      nameEn: 'Green',        hex: '#228B22' },
  { name: 'Skoggrønn',  nameEn: 'Forest Green', hex: '#355E3B' },
  { name: 'Oliven',     nameEn: 'Olive',        hex: '#6B7A3E' },

  // Rosa / rød / lilla
  { name: 'Lavendel',  nameEn: 'Lavender',   hex: '#E6E6FA' },
  { name: 'Lilla',     nameEn: 'Purple',     hex: '#9B59B6' },
  { name: 'Fiolett',   nameEn: 'Violet',     hex: '#6A0DAD' },
  { name: 'Fersken',   nameEn: 'Peach',      hex: '#FFCBA4' },
  { name: 'Lyserosa',  nameEn: 'Light Pink', hex: '#FFB6C1' },
  { name: 'Støvrosa',  nameEn: 'Dusty Rose', hex: '#D4A0A0' },
  { name: 'Rosa',      nameEn: 'Pink',       hex: '#E91E8C' },
  { name: 'Korall',    nameEn: 'Coral',      hex: '#FF6B6B' },
  { name: 'Rød',       nameEn: 'Red',        hex: '#DC143C' },
  { name: 'Burgunder', nameEn: 'Burgundy',   hex: '#722F37' },

  // Gul / oransje
  { name: 'Gul',     nameEn: 'Yellow', hex: '#FFD700' },
  { name: 'Sennep',  nameEn: 'Mustard', hex: '#D4A017' },
  { name: 'Oransje', nameEn: 'Orange',  hex: '#FFA500' },
]

export const COLOR_MAP: Record<string, string> = Object.fromEntries(
  COLORS.map(c => [c.name, c.hex])
)

export const COLOR_MAP_BY_HEX: Record<string, ColorOption> = Object.fromEntries(
  COLORS.map(c => [c.hex, c])
)

export function getColorName(color: ColorOption, lang: string): string {
  return lang === 'en' ? color.nameEn : color.name
}

export function getColorNameByHex(hex: string, lang: string): string {
  const color = COLOR_MAP_BY_HEX[hex]
  if (!color) return hex
  return getColorName(color, lang)
}

export function resolveColorDisplay(name: string, lang: string): { hex: string; displayName: string } {
  const hex = COLOR_MAP[name] ?? '#ccc'
  const colorEntry = COLOR_MAP_BY_HEX[hex]
  return { hex, displayName: colorEntry ? getColorName(colorEntry, lang) : name }
}
