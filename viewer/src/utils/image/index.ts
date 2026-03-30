export interface WindowLevelPreset {
  name: string
  windowWidth: number
  windowCenter: number
}

export const WL_PRESETS: WindowLevelPreset[] = [
  { name: 'Padrão', windowWidth: 400, windowCenter: 40 },
  { name: 'Pulmão', windowWidth: 1500, windowCenter: -600 },
  { name: 'Osso', windowWidth: 2000, windowCenter: 300 },
  { name: 'Abdome', windowWidth: 350, windowCenter: 50 },
  { name: 'Cérebro', windowWidth: 80, windowCenter: 40 },
  { name: 'Mediastino', windowWidth: 350, windowCenter: 25 },
]

/** Converte coordenadas de pixel do canvas para coordenadas normalizadas [0,1]. */
export function canvasToNormalized(
  x: number,
  y: number,
  width: number,
  height: number,
): { x: number; y: number } {
  return { x: x / width, y: y / height }
}
