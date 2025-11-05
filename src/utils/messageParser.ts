// Função para parsear dados em campos (formato: "Campo: Valor, Campo2: Valor2")
export function parseDataFields(dados: string): Array<{ nome: string; valor: string }> {
  if (!dados || dados.trim() === '') return [];
  
  try {
    // Tentar parsear JSON primeiro
    const jsonData = JSON.parse(dados);
    return Object.entries(jsonData).map(([nome, valor]) => ({ nome, valor: String(valor) }));
  } catch {
    // Se não for JSON, parsear como texto separado por vírgula
    return dados.split(',').map(campo => {
      const [nome, ...valorParts] = campo.split(':');
      return {
        nome: nome?.trim() || 'Campo',
        valor: valorParts.join(':').trim() || ''
      };
    }).filter(c => c.nome && c.valor);
  }
}

// Função para formatar dados para exibição
export function formatDataDisplay(dados: string): string {
  if (!dados || dados.trim() === '') return 'Nenhum dado cadastrado';
  
  const campos = parseDataFields(dados);
  if (campos.length === 0) return dados;
  
  return campos.map((c: { nome: string; valor: string }) => `• ${c.nome}: ${c.valor}`).join('\n');
}