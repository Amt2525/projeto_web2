import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { COM_SESSAO, erroDaApi, json, renderizarApp, simularApi, type Rotas } from '../test/utils';

// Dados FICTÍCIOS.
const USINA = {
  id: '0199a000-0000-7000-8000-0000000000a1',
  name: 'Usina Sol Nascente',
  clientName: 'Fazenda Exemplo',
  capacityKwp: 75.5,
  city: 'Montes Claros',
  state: 'MG',
  latitude: -16.7,
  longitude: -43.86,
  installedOn: '2025-03-10',
  isActive: true,
  createdAt: '2026-11-25T12:00:00.000Z',
  updatedAt: '2026-11-25T12:00:00.000Z',
};

function lista(items: unknown[], extra: Record<string, number> = {}) {
  const total = (extra.total as number | undefined) ?? items.length;
  return json({
    items,
    page: 1,
    pageSize: 10,
    total,
    totalPages: Math.ceil(total / 10),
    ...extra,
  });
}

const LISTA_PADRAO = 'GET /api/plants?active=true&page=1';

function comSessao(rotas: Rotas): Rotas {
  return { ...COM_SESSAO, ...rotas };
}

describe('Lista de usinas', () => {
  it('mostra a tabela com os dados formatados em pt-BR e a situação em texto', async () => {
    simularApi(comSessao({ [LISTA_PADRAO]: () => lista([USINA]) }));
    renderizarApp('/usinas');

    expect(await screen.findByRole('heading', { name: 'Usinas' })).toBeTruthy();
    const linha = (await screen.findByRole('link', { name: 'Usina Sol Nascente' })).closest('tr')!;
    expect(within(linha).getByText('Fazenda Exemplo')).toBeTruthy();
    expect(within(linha).getByText('Montes Claros/MG')).toBeTruthy();
    expect(within(linha).getByText('75,5 kWp')).toBeTruthy();
    expect(within(linha).getByText('Ativa')).toBeTruthy();
  });

  it('pede só as usinas ativas por padrão', async () => {
    const api = simularApi(comSessao({ [LISTA_PADRAO]: () => lista([USINA]) }));
    renderizarApp('/usinas');
    await screen.findByRole('link', { name: 'Usina Sol Nascente' });
    expect(api.mock.calls.some(([url]) => url === '/api/plants?active=true&page=1')).toBe(true);
  });

  it('ignora valores estranhos digitados na URL em vez de enviá-los à API', async () => {
    const api = simularApi(comSessao({ [LISTA_PADRAO]: () => lista([]) }));
    renderizarApp('/usinas?active=banana&page=-3');
    await screen.findByText('Nenhuma usina encontrada com estes filtros.');
    const chamadas = api.mock.calls.map(([url]) => url).filter((u) => u.startsWith('/api/plants'));
    expect(chamadas).toEqual(['/api/plants?active=true&page=1']);
  });

  it('mostra aviso quando não há usinas', async () => {
    simularApi(comSessao({ [LISTA_PADRAO]: () => lista([]) }));
    renderizarApp('/usinas');
    expect(await screen.findByText('Nenhuma usina encontrada com estes filtros.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Cadastrar uma usina' })).toBeTruthy();
  });

  it('mostra o erro da API e permite tentar de novo', async () => {
    let tentativa = 0;
    simularApi(
      comSessao({
        [LISTA_PADRAO]: () => {
          tentativa += 1;
          return tentativa === 1
            ? erroDaApi(500, 'ERRO_INTERNO', 'Ocorreu um erro inesperado. Tente novamente.')
            : lista([USINA]);
        },
      }),
    );
    renderizarApp('/usinas');
    const u = userEvent.setup();

    const alerta = await screen.findByRole('alert');
    expect(alerta.textContent).toContain('Ocorreu um erro inesperado');
    await u.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('link', { name: 'Usina Sol Nascente' })).toBeTruthy();
  });

  it('sessão expirada (401): oferece voltar ao login', async () => {
    simularApi(
      comSessao({
        [LISTA_PADRAO]: () => erroDaApi(401, 'NAO_AUTENTICADO', 'Faça login para continuar.'),
        'POST /api/auth/refresh': () => erroDaApi(401, 'NAO_AUTENTICADO', 'x'),
      }),
    );
    renderizarApp('/usinas');
    expect(await screen.findByText('Sua sessão expirou.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Entrar novamente' })).toBeTruthy();
  });

  it('filtra por busca, UF e situação', async () => {
    const api = simularApi(
      comSessao({
        [LISTA_PADRAO]: () => lista([USINA]),
        'GET /api/plants?q=sol&state=MG&page=1': () => lista([USINA]),
      }),
    );
    renderizarApp('/usinas');
    const u = userEvent.setup();
    await screen.findByRole('link', { name: 'Usina Sol Nascente' });

    await u.type(screen.getByLabelText('Buscar por nome, cliente ou cidade'), '  sol ');
    await u.selectOptions(screen.getByLabelText('UF'), 'MG');
    await u.selectOptions(screen.getByLabelText('Situação'), 'all');
    await u.click(screen.getByRole('button', { name: 'Filtrar' }));

    await waitFor(() =>
      expect(api.mock.calls.some(([url]) => url === '/api/plants?q=sol&state=MG&page=1')).toBe(
        true,
      ),
    );
  });

  it('pagina: "Anterior" começa desabilitado e "Próxima" pede a página seguinte', async () => {
    const api = simularApi(
      comSessao({
        [LISTA_PADRAO]: () => lista([USINA], { total: 25 }),
        'GET /api/plants?active=true&page=2': () => lista([], { total: 25, page: 2 }),
      }),
    );
    renderizarApp('/usinas');
    const u = userEvent.setup();
    await screen.findByText(/25 usinas · página 1 de 3/);

    expect((screen.getByRole('button', { name: 'Anterior' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    await u.click(screen.getByRole('button', { name: 'Próxima' }));
    await waitFor(() =>
      expect(api.mock.calls.some(([url]) => url === '/api/plants?active=true&page=2')).toBe(true),
    );
  });
});

describe('Cadastro de usina', () => {
  async function preencherBasico(u: ReturnType<typeof userEvent.setup>) {
    await u.type(await screen.findByLabelText('Nome da usina'), '  Usina Nova  ');
    await u.type(screen.getByLabelText('Cliente'), 'Cliente Novo');
    await u.type(screen.getByLabelText('Capacidade instalada (kWp)'), '75,5');
    await u.type(screen.getByLabelText('Cidade'), 'Bocaiuva');
    await u.selectOptions(screen.getByLabelText('UF'), 'MG');
  }

  it('campos vazios: mostra mensagens junto dos campos e não envia nada', async () => {
    const api = simularApi(comSessao({}));
    renderizarApp('/usinas/nova');
    const u = userEvent.setup();

    await u.click(await screen.findByRole('button', { name: 'Cadastrar usina' }));

    const nome = screen.getByLabelText('Nome da usina');
    await waitFor(() => expect(nome.getAttribute('aria-invalid')).toBe('true'));
    expect(screen.getByText('Informe a capacidade em kWp.')).toBeTruthy();
    expect(api.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
    await waitFor(() => expect(document.activeElement).toBe(nome));
  });

  it('exige latitude e longitude juntas', async () => {
    simularApi(comSessao({}));
    renderizarApp('/usinas/nova');
    const u = userEvent.setup();
    await preencherBasico(u);
    await u.type(screen.getByLabelText('Latitude (opcional)'), '-16,7');

    await u.click(screen.getByRole('button', { name: 'Cadastrar usina' }));

    expect(
      await screen.findByText('Informe latitude e longitude juntas, ou deixe as duas em branco.'),
    ).toBeTruthy();
  });

  it('converte vírgula decimal e campos em branco, envia com cabeçalho anti-CSRF e abre o detalhe', async () => {
    let corpo: unknown;
    let cabecalhos: Record<string, string> = {};
    simularApi(
      comSessao({
        'POST /api/plants': (init) => {
          corpo = JSON.parse(String(init?.body));
          cabecalhos = init?.headers as Record<string, string>;
          return json({ ...USINA, name: 'Usina Nova' }, 201);
        },
        [`GET /api/plants/${USINA.id}`]: () => json({ ...USINA, name: 'Usina Nova' }),
      }),
    );
    renderizarApp('/usinas/nova');
    const u = userEvent.setup();
    await preencherBasico(u);

    await u.click(screen.getByRole('button', { name: 'Cadastrar usina' }));

    expect(await screen.findByRole('heading', { name: 'Usina Nova' })).toBeTruthy();
    // Espaços das pontas removidos, "75,5" virou 75.5 e opcionais em branco viraram null (nunca zero).
    expect(corpo).toEqual({
      name: 'Usina Nova',
      clientName: 'Cliente Novo',
      capacityKwp: 75.5,
      city: 'Bocaiuva',
      state: 'MG',
      latitude: null,
      longitude: null,
      installedOn: null,
    });
    expect(cabecalhos['X-Requested-By']).toBe('solarsystem-web');
  });

  it('usina duplicada (409): mostra o aviso no campo nome e mantém o formulário', async () => {
    simularApi(
      comSessao({
        'POST /api/plants': () =>
          erroDaApi(409, 'USINA_DUPLICADA', 'Já existe uma usina com este nome nesta cidade e UF.'),
      }),
    );
    renderizarApp('/usinas/nova');
    const u = userEvent.setup();
    await preencherBasico(u);

    await u.click(screen.getByRole('button', { name: 'Cadastrar usina' }));

    expect(await screen.findByText(/Já existe uma usina com este nome/)).toBeTruthy();
    expect(screen.getByLabelText('Nome da usina').getAttribute('aria-invalid')).toBe('true');
    expect((screen.getByLabelText('Cliente') as HTMLInputElement).value).toBe('Cliente Novo');
  });

  it('erro de validação do servidor aparece junto do campo indicado', async () => {
    simularApi(
      comSessao({
        'POST /api/plants': () =>
          json(
            {
              error: {
                code: 'DADOS_INVALIDOS',
                message: 'Os dados informados são inválidos.',
                details: [{ field: 'city', message: 'Cidade rejeitada pelo servidor.' }],
              },
            },
            400,
          ),
      }),
    );
    renderizarApp('/usinas/nova');
    const u = userEvent.setup();
    await preencherBasico(u);

    await u.click(screen.getByRole('button', { name: 'Cadastrar usina' }));

    expect(await screen.findByText('Cidade rejeitada pelo servidor.')).toBeTruthy();
  });

  it('falha de rede: mostra aviso geral', async () => {
    simularApi(
      comSessao({
        'POST /api/plants': () => {
          throw new Error('sem rede');
        },
      }),
    );
    renderizarApp('/usinas/nova');
    const u = userEvent.setup();
    await preencherBasico(u);

    await u.click(screen.getByRole('button', { name: 'Cadastrar usina' }));

    const alerta = await screen.findByRole('alert');
    expect(alerta.textContent).toContain('Não foi possível conectar ao servidor');
  });
});

describe('Edição de usina', () => {
  it('carrega os dados no formulário (com vírgula decimal) e salva com PUT', async () => {
    let corpo: unknown;
    simularApi(
      comSessao({
        [`GET /api/plants/${USINA.id}`]: () => json(USINA),
        [`PUT /api/plants/${USINA.id}`]: (init) => {
          corpo = JSON.parse(String(init?.body));
          return json({ ...USINA, capacityKwp: 80 });
        },
      }),
    );
    renderizarApp(`/usinas/${USINA.id}/editar`);
    const u = userEvent.setup();

    const capacidade = (await screen.findByLabelText(
      'Capacidade instalada (kWp)',
    )) as HTMLInputElement;
    expect(capacidade.value).toBe('75,5');
    expect((screen.getByLabelText('Latitude (opcional)') as HTMLInputElement).value).toBe('-16,7');
    expect((screen.getByLabelText('Data de instalação (opcional)') as HTMLInputElement).value).toBe(
      '2025-03-10',
    );

    await u.clear(capacidade);
    await u.type(capacidade, '80');
    await u.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await screen.findByRole('heading', { name: 'Usina Sol Nascente' });
    expect(corpo).toMatchObject({ capacityKwp: 80, latitude: -16.7, installedOn: '2025-03-10' });
  });

  it('usina inexistente: mostra o erro da API', async () => {
    simularApi(
      comSessao({
        [`GET /api/plants/${USINA.id}`]: () =>
          erroDaApi(404, 'NAO_ENCONTRADO', 'Recurso não encontrado.'),
      }),
    );
    renderizarApp(`/usinas/${USINA.id}/editar`);
    expect(await screen.findByRole('alert')).toBeTruthy();
  });
});

describe('Detalhe da usina', () => {
  it('mostra os dados formatados e "Não informada" para o que está em branco', async () => {
    simularApi(
      comSessao({
        [`GET /api/plants/${USINA.id}`]: () =>
          json({ ...USINA, latitude: null, longitude: null, installedOn: null }),
      }),
    );
    renderizarApp(`/usinas/${USINA.id}`);

    expect(await screen.findByRole('heading', { name: 'Usina Sol Nascente' })).toBeTruthy();
    expect(screen.getByText('75,5 kWp')).toBeTruthy();
    expect(screen.getAllByText('Não informada')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Editar' })).toBeTruthy();
  });

  it('formata a data de instalação como dd/mm/aaaa, sem mudar de dia por fuso horário', async () => {
    simularApi(comSessao({ [`GET /api/plants/${USINA.id}`]: () => json(USINA) }));
    renderizarApp(`/usinas/${USINA.id}`);
    expect(await screen.findByText('10/03/2025')).toBeTruthy();
  });

  it('desativar exige confirmação: cancelar não chama a API', async () => {
    const api = simularApi(comSessao({ [`GET /api/plants/${USINA.id}`]: () => json(USINA) }));
    renderizarApp(`/usinas/${USINA.id}`);
    const u = userEvent.setup();

    await u.click(await screen.findByRole('button', { name: 'Desativar usina' }));
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    await u.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(api.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('confirmar a desativação chama a API e atualiza a situação', async () => {
    let inativa = false;
    simularApi(
      comSessao({
        [`GET /api/plants/${USINA.id}`]: () => json({ ...USINA, isActive: !inativa }),
        [`POST /api/plants/${USINA.id}/deactivate`]: () => {
          inativa = true;
          return json({ ...USINA, isActive: false });
        },
      }),
    );
    renderizarApp(`/usinas/${USINA.id}`);
    const u = userEvent.setup();

    await u.click(await screen.findByRole('button', { name: 'Desativar usina' }));
    await u.click(screen.getByRole('button', { name: 'Confirmar desativação' }));

    expect(await screen.findByRole('button', { name: 'Reativar usina' })).toBeTruthy();
    expect(screen.getByText('Inativa')).toBeTruthy();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('usina inativa oferece reativar, sem pedir confirmação', async () => {
    let inativa = true;
    simularApi(
      comSessao({
        [`GET /api/plants/${USINA.id}`]: () => json({ ...USINA, isActive: !inativa }),
        [`POST /api/plants/${USINA.id}/activate`]: () => {
          inativa = false;
          return json(USINA);
        },
      }),
    );
    renderizarApp(`/usinas/${USINA.id}`);
    const u = userEvent.setup();

    await u.click(await screen.findByRole('button', { name: 'Reativar usina' }));

    expect(await screen.findByRole('button', { name: 'Desativar usina' })).toBeTruthy();
  });

  it('mostra erro da API ao falhar a desativação', async () => {
    simularApi(
      comSessao({
        [`GET /api/plants/${USINA.id}`]: () => json(USINA),
        [`POST /api/plants/${USINA.id}/deactivate`]: () =>
          erroDaApi(403, 'SEM_PERMISSAO', 'Você não tem permissão para realizar esta ação.'),
      }),
    );
    renderizarApp(`/usinas/${USINA.id}`);
    const u = userEvent.setup();

    await u.click(await screen.findByRole('button', { name: 'Desativar usina' }));
    await u.click(screen.getByRole('button', { name: 'Confirmar desativação' }));

    const alertas = await screen.findAllByRole('alert');
    expect(alertas.some((a) => a.textContent?.includes('Você não tem permissão'))).toBe(true);
  });

  it('usina inexistente (404): mostra "Usina não encontrada"', async () => {
    simularApi(
      comSessao({
        [`GET /api/plants/${USINA.id}`]: () =>
          erroDaApi(404, 'NAO_ENCONTRADO', 'Recurso não encontrado.'),
      }),
    );
    renderizarApp(`/usinas/${USINA.id}`);
    expect(await screen.findByRole('heading', { name: 'Usina não encontrada' })).toBeTruthy();
  });
});

describe('Navegação', () => {
  it('rotas de usinas exigem login', async () => {
    simularApi({
      'GET /api/auth/me': () => erroDaApi(401, 'NAO_AUTENTICADO', 'x'),
      'POST /api/auth/refresh': () => erroDaApi(401, 'NAO_AUTENTICADO', 'x'),
    });
    renderizarApp('/usinas/nova');
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeTruthy();
  });

  it('o cabeçalho tem navegação, marca a página atual e mantém o botão Sair', async () => {
    simularApi(comSessao({ [LISTA_PADRAO]: () => lista([]) }));
    renderizarApp('/usinas');
    const nav = await screen.findByRole('navigation', { name: 'Principal' });
    expect(within(nav).getByRole('link', { name: 'Usinas' }).getAttribute('aria-current')).toBe(
      'page',
    );
    expect(screen.getByRole('button', { name: 'Sair' })).toBeTruthy();
  });
});
