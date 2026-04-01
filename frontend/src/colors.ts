export interface ColorOption {
  name: string  // stored value + display name (Norwegian)
  hex: string
}

// Nature tones first, then all common colors
export const COLORS: ColorOption[] = [
  // Hvite / kremtoner
  { name: 'Hvit',      hex: '#FFFFFF' },
  { name: 'Kremhvit',  hex: '#FFF8F0' },
  { name: 'Elfenben',  hex: '#FFFFF0' },
  { name: 'Perle',     hex: '#F5F0EA' },

  // Beige / brun / nøytral
  { name: 'Beige',      hex: '#F5F5DC' },
  { name: 'Sand',       hex: '#C2B280' },
  { name: 'Kamel',      hex: '#C19A6B' },
  { name: 'Lys brun',   hex: '#DEB887' },
  { name: 'Brun',       hex: '#8B4513' },
  { name: 'Mørkebrun',  hex: '#4A2C0A' },
  { name: 'Okker',      hex: '#CF9B17' },
  { name: 'Terrakotta', hex: '#CC4E2A' },

  // Grå / sort
  { name: 'Lysegrå',  hex: '#D3D3D3' },
  { name: 'Grå',      hex: '#9E9E9E' },
  { name: 'Mørkegrå', hex: '#616161' },
  { name: 'Sort',     hex: '#212121' },

  // Blå
  { name: 'Himmelblå', hex: '#87CEEB' },
  { name: 'Lyseblå',   hex: '#ADD8E6' },
  { name: 'Klar blå',  hex: '#0066CC' },
  { name: 'Kongeblå',  hex: '#4169E1' },
  { name: 'Gråblå',    hex: '#708090' },
  { name: 'Mariblå',   hex: '#1F305E' },
  { name: 'Navy',      hex: '#001F5B' },
  { name: 'Petrol',    hex: '#005F73' },
  { name: 'Turkis',    hex: '#40E0D0' },

  // Grønn
  { name: 'Mint',       hex: '#A8D8A8' },
  { name: 'Lysegrønn',  hex: '#90EE90' },
  { name: 'Sage grønn', hex: '#9B9B7A' },
  { name: 'Grågrønn',   hex: '#5F7A61' },
  { name: 'Mose grønn', hex: '#8A9A5B' },
  { name: 'Grønn',      hex: '#228B22' },
  { name: 'Skoggrønn',  hex: '#355E3B' },
  { name: 'Oliven',     hex: '#6B7A3E' },

  // Rosa / rød / lilla
  { name: 'Lavendel',  hex: '#E6E6FA' },
  { name: 'Lilla',     hex: '#9B59B6' },
  { name: 'Fiolett',   hex: '#6A0DAD' },
  { name: 'Fersken',   hex: '#FFCBA4' },
  { name: 'Lyserosa',  hex: '#FFB6C1' },
  { name: 'Støvrosa',  hex: '#D4A0A0' },
  { name: 'Rosa',      hex: '#E91E8C' },
  { name: 'Korall',    hex: '#FF6B6B' },
  { name: 'Rød',       hex: '#DC143C' },
  { name: 'Burgunder', hex: '#722F37' },

  // Gul / oransje
  { name: 'Gul',     hex: '#FFD700' },
  { name: 'Sennep',  hex: '#D4A017' },
  { name: 'Oransje', hex: '#FFA500' },
]

export const COLOR_MAP: Record<string, string> = Object.fromEntries(
  COLORS.map(c => [c.name, c.hex])
)
