export const validSectors = [
  'primaria',
  'secundaria',
  'bachillerato',
  'universidad',
] as const;

export type Sector = typeof validSectors[number];
