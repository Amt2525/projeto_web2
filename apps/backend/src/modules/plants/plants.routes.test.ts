import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PrismaClient } from '../../db/prisma';
import {
  CSRF,
  criarAppDeTeste,
  criarPrismaDeTeste,
  criarUsuario,
  fazerLogin,
  limparBanco,
} from '../../../test/helpers';

let prisma: PrismaClient;
let app: ReturnType<typeof criarAppDeTeste>;

beforeAll(() => {
  prisma = criarPrismaDeTeste();
});
afterAll(() => prisma.$disconnect());

beforeEach(async () => {
  await limparBanco(prisma);
  app = criarAppDeTeste(prisma);
});
afterEach(() => app.close());

// Dados FICTÍCIOS de uma usina válida.
const USINA = {
  name: 'Usina Sol Nascente',
  clientName: 'Fazenda Exemplo',
  capacityKwp: 75.5,
  city: 'Montes Claros',
  state: 'MG',
  latitude: -16.7,
  longitude: -43.86,
  installedOn: '2025-03-10',
};

const ID_INEXISTENTE = '0199a000-0000-7000-8000-00000000dead';

async function entrarComoTecnico() {
  const usuario = await criarUsuario(prisma, { role: 'TECNICO' });
  const { cookies } = await fazerLogin(app);
  return { usuario, cookies };
}

function chamar(
  method: 'GET' | 'POST' | 'PUT',
  url: string,
  cookies?: string,
  payload?: unknown,
  headers: Record<string, string> = CSRF,
) {
  return app.inject({
    method,
    url,
    headers: { ...(method === 'GET' ? {} : headers), ...(cookies ? { cookie: cookies } : {}) },
    ...(payload !== undefined ? { payload: payload as object } : {}),
  });
}

async function criarUsina(cookies: string, dados: Partial<typeof USINA> = {}) {
  const r = await chamar('POST', '/api/plants', cookies, { ...USINA, ...dados });
  expect(r.statusCode).toBe(201);
  return r.json() as { id: string; name: string };
}

describe('autenticação e autorização', () => {
  it('nega todas as rotas a quem não está logado', async () => {
    const id = ID_INEXISTENTE;
    const chamadas = [
      chamar('GET', '/api/plants'),
      chamar('GET', `/api/plants/${id}`),
      chamar('POST', '/api/plants', undefined, USINA),
      chamar('PUT', `/api/plants/${id}`, undefined, USINA),
      chamar('POST', `/api/plants/${id}/deactivate`),
      chamar('POST', `/api/plants/${id}/activate`),
    ];
    for (const resposta of await Promise.all(chamadas)) {
      expect(resposta.statusCode).toBe(401);
    }
  });

  it('exige o cabeçalho anti-CSRF para criar', async () => {
    const { cookies } = await entrarComoTecnico();
    const r = await chamar('POST', '/api/plants', cookies, USINA, {});
    expect(r.statusCode).toBe(403);
    expect(await prisma.plant.count()).toBe(0);
  });

  it('administrador também pode cadastrar', async () => {
    await criarUsuario(prisma, { role: 'ADMIN', email: 'admin@exemplo.com' });
    const { cookies } = await fazerLogin(app, 'admin@exemplo.com');
    const r = await chamar('POST', '/api/plants', cookies, USINA);
    expect(r.statusCode).toBe(201);
  });

  it('recusa escrita quando a sessão foi encerrada, mesmo com o JWT ainda válido', async () => {
    const { cookies } = await entrarComoTecnico();
    await prisma.refreshToken.updateMany({ data: { revokedAt: new Date() } });
    const r = await chamar('POST', '/api/plants', cookies, USINA);
    expect(r.statusCode).toBe(401);
    expect(await prisma.plant.count()).toBe(0);
  });
});

describe('POST /api/plants', () => {
  it('cria a usina, guarda a capacidade em Wp e devolve o DTO em kWp', async () => {
    const { cookies } = await entrarComoTecnico();
    const r = await chamar('POST', '/api/plants', cookies, USINA);

    expect(r.statusCode).toBe(201);
    const corpo = r.json();
    expect(corpo).toMatchObject({ ...USINA, isActive: true });
    expect(corpo.capacityKwp).toBe(75.5);
    // O DTO não vaza campos internos.
    expect(Object.keys(corpo).sort()).toEqual(
      [
        'capacityKwp',
        'city',
        'clientName',
        'createdAt',
        'id',
        'installedOn',
        'isActive',
        'latitude',
        'longitude',
        'name',
        'state',
        'updatedAt',
      ].sort(),
    );

    const linha = await prisma.plant.findUniqueOrThrow({ where: { id: corpo.id } });
    expect(linha.capacityWp).toBe(75_500);
  });

  it('registra quem cadastrou a partir da sessão e grava auditoria', async () => {
    const { usuario, cookies } = await entrarComoTecnico();
    const criada = await criarUsina(cookies);

    const linha = await prisma.plant.findUniqueOrThrow({ where: { id: criada.id } });
    expect(linha.createdById).toBe(usuario.id);

    const auditoria = await prisma.auditLog.findFirstOrThrow({ where: { action: 'USINA_CRIADA' } });
    expect(auditoria.userId).toBe(usuario.id);
    expect(auditoria.metadata).toEqual({ plantId: criada.id });
  });

  it('rejeita campos que o cliente não pode definir (mass assignment)', async () => {
    const { cookies } = await entrarComoTecnico();
    for (const extra of [
      { isActive: false },
      { createdById: ID_INEXISTENTE },
      { id: ID_INEXISTENTE },
    ]) {
      const r = await chamar('POST', '/api/plants', cookies, { ...USINA, ...extra });
      expect(r.statusCode).toBe(400);
    }
    expect(await prisma.plant.count()).toBe(0);
  });

  it('rejeita dados inválidos com 400 e indica os campos, sem gravar nada', async () => {
    const { cookies } = await entrarComoTecnico();
    const r = await chamar('POST', '/api/plants', cookies, {
      ...USINA,
      name: 'ab',
      capacityKwp: -5,
      state: 'XX',
    });
    expect(r.statusCode).toBe(400);
    const campos = (r.json().error.details as { field: string }[]).map((d) => d.field).sort();
    expect(campos).toEqual(['capacityKwp', 'name', 'state']);
    expect(await prisma.plant.count()).toBe(0);
  });

  it('rejeita corpo vazio', async () => {
    const { cookies } = await entrarComoTecnico();
    const r = await chamar('POST', '/api/plants', cookies);
    expect(r.statusCode).toBe(400);
  });

  it('limpa espaços e normaliza a UF antes de gravar', async () => {
    const { cookies } = await entrarComoTecnico();
    const criada = await criarUsina(cookies, { name: '  Usina Espaçada  ', state: 'mg' });
    const linha = await prisma.plant.findUniqueOrThrow({ where: { id: criada.id } });
    expect(linha.name).toBe('Usina Espaçada');
    expect(linha.state).toBe('MG');
  });

  it('não confunde texto com código: nome com aspas e SQL é gravado como texto', async () => {
    const { cookies } = await entrarComoTecnico();
    const nome = `Robert'); DROP TABLE plants;--`;
    const criada = await criarUsina(cookies, { name: nome });
    expect(criada.name).toBe(nome);
    expect(await prisma.plant.count()).toBe(1);
  });

  describe('duplicidade', () => {
    it('recusa o mesmo nome na mesma cidade e UF, sem diferenciar maiúsculas', async () => {
      const { cookies } = await entrarComoTecnico();
      await criarUsina(cookies);
      const r = await chamar('POST', '/api/plants', cookies, {
        ...USINA,
        name: '  USINA SOL NASCENTE ',
        city: 'montes claros',
      });
      expect(r.statusCode).toBe(409);
      expect(r.json().error.code).toBe('USINA_DUPLICADA');
      expect(await prisma.plant.count()).toBe(1);
    });

    it('aceita o mesmo nome em outra cidade ou em outra UF', async () => {
      const { cookies } = await entrarComoTecnico();
      await criarUsina(cookies);
      await criarUsina(cookies, { city: 'Bocaiuva' });
      await criarUsina(cookies, { state: 'BA' });
      expect(await prisma.plant.count()).toBe(3);
    });

    it('não grava auditoria de uma criação que falhou', async () => {
      const { cookies } = await entrarComoTecnico();
      await criarUsina(cookies);
      await chamar('POST', '/api/plants', cookies, USINA);
      expect(await prisma.auditLog.count({ where: { action: 'USINA_CRIADA' } })).toBe(1);
    });
  });
});

describe('GET /api/plants/:id', () => {
  it('devolve a usina, mesmo cadastrada por outro usuário (técnico vê todas)', async () => {
    const { cookies } = await entrarComoTecnico();
    const criada = await criarUsina(cookies);

    await criarUsuario(prisma, { email: 'bia@exemplo.com', name: 'Bia' });
    const outra = await fazerLogin(app, 'bia@exemplo.com');
    const r = await chamar('GET', `/api/plants/${criada.id}`, outra.cookies);
    expect(r.statusCode).toBe(200);
    expect(r.json().id).toBe(criada.id);
  });

  it('devolve 404 para id que não existe e 400 para id mal formado', async () => {
    const { cookies } = await entrarComoTecnico();
    expect((await chamar('GET', `/api/plants/${ID_INEXISTENTE}`, cookies)).statusCode).toBe(404);
    expect((await chamar('GET', '/api/plants/abc', cookies)).statusCode).toBe(400);
    expect((await chamar('GET', "/api/plants/1' OR '1'='1", cookies)).statusCode).toBe(400);
  });
});

describe('PUT /api/plants/:id', () => {
  it('edita todos os campos e grava auditoria', async () => {
    const { usuario, cookies } = await entrarComoTecnico();
    const criada = await criarUsina(cookies);

    const novos = {
      ...USINA,
      name: 'Usina Renomeada',
      capacityKwp: 100,
      latitude: null,
      longitude: null,
      installedOn: null,
    };
    const r = await chamar('PUT', `/api/plants/${criada.id}`, cookies, novos);

    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject(novos);
    const linha = await prisma.plant.findUniqueOrThrow({ where: { id: criada.id } });
    expect(linha.capacityWp).toBe(100_000);
    expect(linha.latitude).toBeNull();
    // Quem criou não muda ao editar.
    expect(linha.createdById).toBe(usuario.id);
    expect(await prisma.auditLog.count({ where: { action: 'USINA_EDITADA' } })).toBe(1);
  });

  it('permite salvar sem mudar o nome (não conta como duplicada de si mesma)', async () => {
    const { cookies } = await entrarComoTecnico();
    const criada = await criarUsina(cookies);
    const r = await chamar('PUT', `/api/plants/${criada.id}`, cookies, {
      ...USINA,
      capacityKwp: 80,
    });
    expect(r.statusCode).toBe(200);
  });

  it('recusa mudar o nome para o de outra usina da mesma cidade', async () => {
    const { cookies } = await entrarComoTecnico();
    await criarUsina(cookies);
    const outra = await criarUsina(cookies, { name: 'Outra Usina' });
    const r = await chamar('PUT', `/api/plants/${outra.id}`, cookies, USINA);
    expect(r.statusCode).toBe(409);
    const linha = await prisma.plant.findUniqueOrThrow({ where: { id: outra.id } });
    expect(linha.name).toBe('Outra Usina');
  });

  it('não permite alterar a situação por esta rota (mass assignment)', async () => {
    const { cookies } = await entrarComoTecnico();
    const criada = await criarUsina(cookies);
    const r = await chamar('PUT', `/api/plants/${criada.id}`, cookies, {
      ...USINA,
      isActive: false,
    });
    expect(r.statusCode).toBe(400);
    expect((await prisma.plant.findUniqueOrThrow({ where: { id: criada.id } })).isActive).toBe(
      true,
    );
  });

  it('devolve 404 para id que não existe', async () => {
    const { cookies } = await entrarComoTecnico();
    const r = await chamar('PUT', `/api/plants/${ID_INEXISTENTE}`, cookies, USINA);
    expect(r.statusCode).toBe(404);
  });
});

describe('desativar e reativar', () => {
  it('desativa sem apagar, reativa, e registra auditoria de cada ação', async () => {
    const { cookies } = await entrarComoTecnico();
    const criada = await criarUsina(cookies);

    const off = await chamar('POST', `/api/plants/${criada.id}/deactivate`, cookies);
    expect(off.statusCode).toBe(200);
    expect(off.json().isActive).toBe(false);
    expect(await prisma.plant.count()).toBe(1);

    const on = await chamar('POST', `/api/plants/${criada.id}/activate`, cookies);
    expect(on.json().isActive).toBe(true);

    expect(await prisma.auditLog.count({ where: { action: 'USINA_DESATIVADA' } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { action: 'USINA_REATIVADA' } })).toBe(1);
  });

  it('repetir a operação é inofensivo', async () => {
    const { cookies } = await entrarComoTecnico();
    const criada = await criarUsina(cookies);
    await chamar('POST', `/api/plants/${criada.id}/deactivate`, cookies);
    const de_novo = await chamar('POST', `/api/plants/${criada.id}/deactivate`, cookies);
    expect(de_novo.statusCode).toBe(200);
    expect(de_novo.json().isActive).toBe(false);
  });

  it('devolve 404 para usina que não existe', async () => {
    const { cookies } = await entrarComoTecnico();
    const r = await chamar('POST', `/api/plants/${ID_INEXISTENTE}/deactivate`, cookies);
    expect(r.statusCode).toBe(404);
  });
});

describe('GET /api/plants (lista)', () => {
  async function popular(cookies: string) {
    await criarUsina(cookies, {
      name: 'Alfa Solar',
      city: 'Montes Claros',
      state: 'MG',
      clientName: 'Cliente Um',
    });
    await criarUsina(cookies, {
      name: 'Beta Energia',
      city: 'Salvador',
      state: 'BA',
      clientName: 'Cliente Dois',
    });
    const gama = await criarUsina(cookies, {
      name: 'Gama Fotovoltaica',
      city: 'Belo Horizonte',
      state: 'MG',
      clientName: 'Cliente Três',
    });
    await chamar('POST', `/api/plants/${gama.id}/deactivate`, cookies);
  }

  it('lista ordenada por nome, com os totais', async () => {
    const { cookies } = await entrarComoTecnico();
    await popular(cookies);
    const r = await chamar('GET', '/api/plants', cookies);
    expect(r.statusCode).toBe(200);
    const corpo = r.json();
    expect(corpo.items.map((i: { name: string }) => i.name)).toEqual([
      'Alfa Solar',
      'Beta Energia',
      'Gama Fotovoltaica',
    ]);
    expect(corpo).toMatchObject({ total: 3, page: 1, pageSize: 10, totalPages: 1 });
  });

  it('lista vazia quando não há usinas', async () => {
    const { cookies } = await entrarComoTecnico();
    const r = await chamar('GET', '/api/plants', cookies);
    expect(r.json()).toMatchObject({ items: [], total: 0, totalPages: 0 });
  });

  it('filtra por UF e por situação', async () => {
    const { cookies } = await entrarComoTecnico();
    await popular(cookies);
    const mg = await chamar('GET', '/api/plants?state=MG', cookies);
    expect(mg.json().total).toBe(2);
    const mgAtivas = await chamar('GET', '/api/plants?state=mg&active=true', cookies);
    expect(mgAtivas.json().items.map((i: { name: string }) => i.name)).toEqual(['Alfa Solar']);
    const inativas = await chamar('GET', '/api/plants?active=false', cookies);
    expect(inativas.json().total).toBe(1);
  });

  it('busca por nome, cliente ou cidade, sem diferenciar maiúsculas', async () => {
    const { cookies } = await entrarComoTecnico();
    await popular(cookies);
    const porNome = await chamar('GET', '/api/plants?q=BETA', cookies);
    expect(porNome.json().total).toBe(1);
    const porCliente = await chamar('GET', `/api/plants?q=${encodeURIComponent('três')}`, cookies);
    expect(porCliente.json().total).toBe(1);
    const porCidade = await chamar('GET', '/api/plants?q=salvador', cookies);
    expect(porCidade.json().total).toBe(1);
  });

  it('trata texto de injeção de SQL na busca como texto comum', async () => {
    const { cookies } = await entrarComoTecnico();
    await popular(cookies);
    const q = encodeURIComponent("'; DROP TABLE plants; --");
    const r = await chamar('GET', `/api/plants?q=${q}`, cookies);
    expect(r.statusCode).toBe(200);
    expect(r.json().total).toBe(0);
    expect(await prisma.plant.count()).toBe(3);
  });

  it('pagina sem repetir nem pular itens', async () => {
    const { cookies } = await entrarComoTecnico();
    await popular(cookies);
    const p1 = (await chamar('GET', '/api/plants?pageSize=2&page=1', cookies)).json();
    const p2 = (await chamar('GET', '/api/plants?pageSize=2&page=2', cookies)).json();
    expect(p1.totalPages).toBe(2);
    expect(p1.items).toHaveLength(2);
    expect(p2.items).toHaveLength(1);
    const nomes = [...p1.items, ...p2.items].map((i: { name: string }) => i.name);
    expect(new Set(nomes).size).toBe(3);
    // Página além do fim: lista vazia, não erro.
    const alem = await chamar('GET', '/api/plants?pageSize=2&page=9', cookies);
    expect(alem.json().items).toEqual([]);
  });

  it('rejeita parâmetros inválidos com 400', async () => {
    const { cookies } = await entrarComoTecnico();
    for (const consulta of [
      'pageSize=51',
      'pageSize=0',
      'page=0',
      'page=abc',
      'state=XX',
      'active=talvez',
      'ordenar=nome',
    ]) {
      const r = await chamar('GET', `/api/plants?${consulta}`, cookies);
      expect(r.statusCode, consulta).toBe(400);
    }
  });
});

describe('restrições do próprio banco (última barreira)', () => {
  it('o banco recusa dados inválidos mesmo sem passar pela API', async () => {
    const base = {
      name: 'Usina Direta',
      client_name: 'Cliente',
      capacity_wp: 1000,
      city: 'Cidade',
      state: 'MG',
    };
    const inserir = (
      extra: Partial<Record<keyof typeof base | 'latitude' | 'longitude', unknown>>,
    ) => {
      const d = { ...base, ...extra };
      return prisma.$executeRawUnsafe(
        `INSERT INTO plants (id, name, client_name, capacity_wp, city, state, latitude, longitude, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, now())`,
        d.name,
        d.client_name,
        d.capacity_wp,
        d.city,
        d.state,
        (d as { latitude?: unknown }).latitude ?? null,
        (d as { longitude?: unknown }).longitude ?? null,
      );
    };

    await expect(inserir({})).resolves.toBe(1);
    await expect(inserir({ name: 'Outra Direta', capacity_wp: 0 })).rejects.toThrow();
    await expect(inserir({ name: 'Outra Direta', state: 'XX' })).rejects.toThrow();
    await expect(inserir({ name: ' Com Espaço ' })).rejects.toThrow();
    await expect(inserir({ name: 'Outra Direta', latitude: 10 })).rejects.toThrow();
    await expect(inserir({ name: 'Outra Direta', latitude: 91, longitude: 0 })).rejects.toThrow();
    // Duplicidade (maiúsculas diferentes) também é barrada no banco.
    await expect(inserir({ name: 'USINA DIRETA' })).rejects.toThrow();
  });
});
