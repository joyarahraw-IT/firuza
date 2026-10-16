// Colour filter families, derived from the hex colours stored on each product.
export const COLOR_FAMILIES = ['Rojo', 'Rosa', 'Naranja y ámbar', 'Amarillo y dorado', 'Verde', 'Turquesa', 'Azul', 'Morado', 'Marrón', 'Negro', 'Blanco y crudo', 'Gris'] as const;
export type ColorFamily = (typeof COLOR_FAMILIES)[number];

export function colorFamily(hex: string): ColorFamily {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  if (l < 0.14) return 'Negro';
  if (s < 0.14) return l > 0.82 ? 'Blanco y crudo' : l < 0.3 ? 'Negro' : 'Gris';
  if (l > 0.86) return 'Blanco y crudo';
  if (h < 12 || h >= 345) return l > 0.65 ? 'Rosa' : 'Rojo';
  if (h < 20 && l < 0.4) return 'Marrón';
  if (h < 45) return l < 0.42 ? 'Marrón' : 'Naranja y ámbar';
  if (h < 70) return 'Amarillo y dorado';
  if (h < 165) return 'Verde';
  if (h < 200) return 'Turquesa';
  if (h < 255) return 'Azul';
  if (h < 300) return 'Morado';
  return 'Rosa';
}
