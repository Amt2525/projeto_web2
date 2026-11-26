// Formatação para exibição (pt-BR). O banco e a API guardam números e datas "puros".

const numeroBr = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });

export function formatarKwp(kwp: number): string {
  return `${numeroBr.format(kwp)} kWp`;
}

// "2025-03-10" -> "10/03/2025". Trocamos o texto de lugar, sem criar um Date, para o fuso horário não mudar o dia.
export function formatarData(data: string | null): string {
  if (!data) return 'Não informada';
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function formatarCoordenada(valor: number | null): string {
  return valor === null
    ? 'Não informada'
    : valor.toLocaleString('pt-BR', { maximumFractionDigits: 6 });
}
