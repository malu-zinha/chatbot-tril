// Define as áreas disponíveis no sistema
export const availableAreas = [
  'Elétrico',
  'Hidrossanitário',
  'Climatização',
  'Drenagem',
  'Solar'
] as const;

export type Area = typeof availableAreas[number];

// Mapeamento de campos sugeridos por área
export const areaCampos: Record<Area, string[]> = {
  'Elétrico': ['Circuitos', 'Quadros', 'Pontos de luz', 'Tomadas'],
  'Hidrossanitário': ['Tubulação', 'Válvulas', 'Conexões', 'Registros'],
  'Climatização': ['BTUs', 'Equipamentos', 'Dutos', 'Difusores'],
  'Drenagem': ['Tubos', 'Caixas', 'Calhas', 'Conexões'],
  'Solar': ['Placas', 'Inversores', 'Potência', 'Estrutura']
};

// Verifica se uma área é válida
export function isValidArea(area: string): area is Area {
  return availableAreas.includes(area as Area);
}

// Obtém campos sugeridos para uma área
export function getSuggestedFields(area: Area): string[] {
  return areaCampos[area] || [];
}