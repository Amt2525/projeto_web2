import { describe, expect, it } from 'vitest';
import { kwpParaWp, plantInputSchema, plantListQuerySchema, wpParaKwp } from './plant';

// Dados FICTÍCIOS de uma usina válida.
const valida = {
  name: 'Usina Sol Nascente',
  clientName: 'Fazenda Exemplo',
  capacityKwp: 75.5,
  city: 'Montes Claros',
  state: 'MG',
  latitude: -16.7,
  longitude: -43.86,
  installedOn: '2025-03-10',
};

function mensagens(entrada: unknown): string[] {
  const r = plantInputSchema.safeParse(entrada);
  return r.success ? [] : r.error.issues.map((i) => i.message);
}

describe('plantInputSchema', () => {
  it('aceita uma usina completa', () => {
    expect(plantInputSchema.safeParse(valida).success).toBe(true);
  });

  it('aceita usina sem coordenadas e sem data de instalação', () => {
    const r = plantInputSchema.safeParse({
      ...valida,
      latitude: null,
      longitude: null,
      installedOn: null,
    });
    expect(r.success).toBe(true);
  });

  it('limpa espaços das pontas e normaliza a UF para maiúsculas', () => {
    const r = plantInputSchema.parse({ ...valida, name: '  Usina Sol  ', state: ' mg ' });
    expect(r.name).toBe('Usina Sol');
    expect(r.state).toBe('MG');
  });

  it('rejeita campos desconhecidos (mass assignment)', () => {
    expect(plantInputSchema.safeParse({ ...valida, isActive: false }).success).toBe(false);
    expect(plantInputSchema.safeParse({ ...valida, id: 'x' }).success).toBe(false);
    expect(plantInputSchema.safeParse({ ...valida, createdBy: 'x' }).success).toBe(false);
  });

  it('rejeita nome curto ou só com espaços', () => {
    expect(plantInputSchema.safeParse({ ...valida, name: 'ab' }).success).toBe(false);
    expect(plantInputSchema.safeParse({ ...valida, name: '     ' }).success).toBe(false);
  });

  it('rejeita nome com mais de 120 caracteres', () => {
    expect(plantInputSchema.safeParse({ ...valida, name: 'a'.repeat(121) }).success).toBe(false);
    expect(plantInputSchema.safeParse({ ...valida, name: 'a'.repeat(120) }).success).toBe(true);
  });

  it('rejeita UF inexistente', () => {
    expect(plantInputSchema.safeParse({ ...valida, state: 'XX' }).success).toBe(false);
    expect(plantInputSchema.safeParse({ ...valida, state: 'MGG' }).success).toBe(false);
  });

  describe('capacidade', () => {
    it('rejeita zero, negativo e acima do máximo', () => {
      for (const capacityKwp of [0, -1, 100_000.001, Number.NaN, Infinity]) {
        expect(plantInputSchema.safeParse({ ...valida, capacityKwp }).success).toBe(false);
      }
      expect(plantInputSchema.safeParse({ ...valida, capacityKwp: 100_000 }).success).toBe(true);
    });

    it('rejeita texto no lugar de número', () => {
      expect(plantInputSchema.safeParse({ ...valida, capacityKwp: '75' }).success).toBe(false);
    });

    it('aceita até 3 casas decimais e rejeita mais que isso', () => {
      expect(plantInputSchema.safeParse({ ...valida, capacityKwp: 0.001 }).success).toBe(true);
      expect(plantInputSchema.safeParse({ ...valida, capacityKwp: 5.4321 }).success).toBe(false);
    });
  });

  describe('coordenadas', () => {
    it('rejeita latitude e longitude fora do intervalo', () => {
      expect(plantInputSchema.safeParse({ ...valida, latitude: 90.1 }).success).toBe(false);
      expect(plantInputSchema.safeParse({ ...valida, latitude: -90.1 }).success).toBe(false);
      expect(plantInputSchema.safeParse({ ...valida, longitude: 180.1 }).success).toBe(false);
      expect(plantInputSchema.safeParse({ ...valida, longitude: -180.1 }).success).toBe(false);
    });

    it('aceita os limites exatos', () => {
      const r = plantInputSchema.safeParse({ ...valida, latitude: -90, longitude: 180 });
      expect(r.success).toBe(true);
    });

    it('exige as duas coordenadas juntas, ou nenhuma', () => {
      expect(mensagens({ ...valida, longitude: null })).toContain(
        'Informe latitude e longitude juntas, ou deixe as duas em branco.',
      );
      expect(plantInputSchema.safeParse({ ...valida, latitude: null }).success).toBe(false);
    });
  });

  describe('data de instalação', () => {
    it('rejeita data que não existe', () => {
      expect(plantInputSchema.safeParse({ ...valida, installedOn: '2025-02-31' }).success).toBe(
        false,
      );
      expect(plantInputSchema.safeParse({ ...valida, installedOn: '10/03/2025' }).success).toBe(
        false,
      );
    });

    it('rejeita data no futuro', () => {
      expect(plantInputSchema.safeParse({ ...valida, installedOn: '2999-01-01' }).success).toBe(
        false,
      );
    });
  });
});

describe('plantListQuerySchema', () => {
  it('usa página 1 e 10 itens quando nada é informado', () => {
    const r = plantListQuerySchema.parse({});
    expect(r.page).toBe(1);
    expect(r.pageSize).toBe(10);
  });

  it('converte texto em número e "true"/"false" em booleano', () => {
    const r = plantListQuerySchema.parse({
      page: '2',
      pageSize: '20',
      active: 'false',
      state: 'sp',
    });
    expect(r).toMatchObject({ page: 2, pageSize: 20, active: false, state: 'SP' });
  });

  it('limita o tamanho da página a 50', () => {
    expect(plantListQuerySchema.safeParse({ pageSize: '51' }).success).toBe(false);
    expect(plantListQuerySchema.safeParse({ pageSize: '50' }).success).toBe(true);
  });

  it('rejeita página zero, negativa, fracionada ou texto', () => {
    for (const page of ['0', '-1', '1.5', 'abc']) {
      expect(plantListQuerySchema.safeParse({ page }).success).toBe(false);
    }
  });

  it('rejeita parâmetros desconhecidos e filtro de situação inválido', () => {
    expect(plantListQuerySchema.safeParse({ ordenar: 'x' }).success).toBe(false);
    expect(plantListQuerySchema.safeParse({ active: 'talvez' }).success).toBe(false);
  });
});

describe('conversão kWp ↔ Wp', () => {
  it('converte sem erro de ponto flutuante', () => {
    expect(kwpParaWp(75.5)).toBe(75_500);
    expect(kwpParaWp(0.29)).toBe(290);
    expect(kwpParaWp(1.005)).toBe(1005);
    expect(wpParaKwp(75_500)).toBe(75.5);
  });
});
