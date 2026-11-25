import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  COM_SESSAO,
  SEM_SESSAO,
  USUARIO,
  erroDaApi,
  json,
  renderizarApp,
  simularApi,
  type Rotas,
} from '../test/utils';

// Senha fictícia só para os testes.
const SENHA = 'senha-de-teste-bem-longa-1';

async function preencher(email: string, senha: string) {
  const u = userEvent.setup();
  await u.type(await screen.findByLabelText('E-mail'), email);
  await u.type(screen.getByLabelText('Senha'), senha);
  return u;
}

describe('Tela de login', () => {
  it('mostra título, campos com rótulo e botão de entrar', async () => {
    simularApi(SEM_SESSAO);
    renderizarApp('/login');

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeTruthy();
    expect(screen.getByLabelText('E-mail')).toBeTruthy();
    expect(screen.getByLabelText('Senha')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeTruthy();
  });

  it('usa os atributos de preenchimento automático corretos (gerenciadores de senha)', async () => {
    simularApi(SEM_SESSAO);
    renderizarApp('/login');

    expect((await screen.findByLabelText('E-mail')).getAttribute('autocomplete')).toBe('username');
    expect(screen.getByLabelText('Senha').getAttribute('autocomplete')).toBe('current-password');
  });

  it('com campos vazios mostra as mensagens e NÃO chama a API de login', async () => {
    const api = simularApi(SEM_SESSAO);
    renderizarApp('/login');
    const u = userEvent.setup();

    await u.click(await screen.findByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Informe um e-mail válido.')).toBeTruthy();
    expect(screen.getByText('Informe a senha.')).toBeTruthy();
    expect(api.mock.calls.some(([url]) => url === '/api/auth/login')).toBe(false);
  });

  it('liga a mensagem de erro ao campo (aria-invalid e aria-describedby) e foca o primeiro inválido', async () => {
    simularApi(SEM_SESSAO);
    renderizarApp('/login');
    const u = userEvent.setup();

    await u.click(await screen.findByRole('button', { name: 'Entrar' }));

    const email = await screen.findByLabelText('E-mail');
    expect(email.getAttribute('aria-invalid')).toBe('true');
    const idDoErro = email.getAttribute('aria-describedby');
    expect(document.getElementById(idDoErro!)?.textContent).toBe('Informe um e-mail válido.');
    await waitFor(() => expect(document.activeElement).toBe(email));
  });

  it('rejeita e-mail em formato inválido', async () => {
    const api = simularApi(SEM_SESSAO);
    renderizarApp('/login');
    const u = await preencher('isto-nao-e-email', SENHA);

    await u.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Informe um e-mail válido.')).toBeTruthy();
    expect(api.mock.calls.some(([url]) => url === '/api/auth/login')).toBe(false);
  });

  it('envia e-mail normalizado e o cabeçalho anti-CSRF, e leva à tela inicial', async () => {
    let corpoEnviado: unknown;
    let cabecalhos: Record<string, string> = {};
    simularApi({
      ...SEM_SESSAO,
      'POST /api/auth/login': (init) => {
        corpoEnviado = JSON.parse(String(init?.body));
        cabecalhos = init?.headers as Record<string, string>;
        return json({ user: USUARIO });
      },
    });
    renderizarApp('/login');
    const u = await preencher('  ANA@Exemplo.com ', SENHA);

    await u.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('heading', { name: 'Visão geral' })).toBeTruthy();
    expect(screen.getByText('Ana Teste')).toBeTruthy();
    expect(corpoEnviado).toEqual({ email: 'ana@exemplo.com', password: SENHA });
    expect(cabecalhos['X-Requested-By']).toBe('solarsystem-web');
  });

  it('credenciais inválidas: mostra o aviso da API, limpa a senha e devolve o foco a ela', async () => {
    simularApi({
      ...SEM_SESSAO,
      'POST /api/auth/login': () =>
        erroDaApi(
          401,
          'CREDENCIAIS_INVALIDAS',
          'E-mail ou senha inválidos, ou conta temporariamente bloqueada.',
        ),
    });
    renderizarApp('/login');
    const u = await preencher('ana@exemplo.com', SENHA);

    await u.click(screen.getByRole('button', { name: 'Entrar' }));

    const aviso = await screen.findByRole('alert');
    expect(aviso.textContent).toContain('E-mail ou senha inválidos');
    const senha = screen.getByLabelText('Senha') as HTMLInputElement;
    expect(senha.value).toBe('');
    await waitFor(() => expect(document.activeElement).toBe(senha));
    // Continua na tela de login.
    expect(screen.queryByRole('heading', { name: 'Visão geral' })).toBeNull();
  });

  it('excesso de tentativas (429): mostra aviso específico', async () => {
    simularApi({
      ...SEM_SESSAO,
      'POST /api/auth/login': () => erroDaApi(429, 'MUITAS_REQUISICOES', 'x'),
    });
    renderizarApp('/login');
    const u = await preencher('ana@exemplo.com', SENHA);

    await u.click(screen.getByRole('button', { name: 'Entrar' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Muitas tentativas');
  });

  it('sem conexão com o servidor: mostra aviso de conexão', async () => {
    simularApi({
      ...SEM_SESSAO,
      'POST /api/auth/login': () => {
        throw new TypeError('Failed to fetch');
      },
    });
    renderizarApp('/login');
    const u = await preencher('ana@exemplo.com', SENHA);

    await u.click(screen.getByRole('button', { name: 'Entrar' }));

    expect((await screen.findByRole('alert')).textContent).toContain('conectar ao servidor');
  });

  it('desabilita o botão e mostra "Entrando..." enquanto envia (evita envio duplo)', async () => {
    let concluir: (r: Response) => void = () => {};
    const api = simularApi({
      ...SEM_SESSAO,
      'POST /api/auth/login': () => new Promise<Response>((resolver) => (concluir = resolver)),
    });
    renderizarApp('/login');
    const u = await preencher('ana@exemplo.com', SENHA);

    await u.click(screen.getByRole('button', { name: 'Entrar' }));

    const botao = await screen.findByRole('button', { name: 'Entrando...' });
    expect((botao as HTMLButtonElement).disabled).toBe(true);
    expect(botao.getAttribute('aria-busy')).toBe('true');
    await u.click(botao);
    expect(api.mock.calls.filter(([url]) => url === '/api/auth/login')).toHaveLength(1);

    concluir(json({ user: USUARIO }));
    expect(await screen.findByRole('heading', { name: 'Visão geral' })).toBeTruthy();
  });

  it('o botão Mostrar/Ocultar alterna a visibilidade da senha e atualiza o nome acessível', async () => {
    simularApi(SEM_SESSAO);
    renderizarApp('/login');
    const u = userEvent.setup();
    const campo = (await screen.findByLabelText('Senha')) as HTMLInputElement;

    expect(campo.type).toBe('password');

    await u.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(campo.type).toBe('text');

    await u.click(screen.getByRole('button', { name: 'Ocultar senha' }));
    expect(campo.type).toBe('password');
    expect(screen.getByRole('button', { name: 'Mostrar senha' })).toBeTruthy();
  });

  it('o botão de mostrar senha é alcançável pelo teclado (Tab) e acionável com Enter', async () => {
    simularApi(SEM_SESSAO);
    renderizarApp('/login');
    const u = userEvent.setup();
    const campo = (await screen.findByLabelText('Senha')) as HTMLInputElement;

    await u.click(screen.getByLabelText('E-mail'));
    await u.tab(); // e-mail -> senha
    await u.tab(); // senha -> botão mostrar
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Mostrar senha' }));
    await u.keyboard('{Enter}');
    expect(campo.type).toBe('text');
  });

  it('quem já está logado é levado direto para a tela inicial', async () => {
    simularApi(COM_SESSAO);
    renderizarApp('/login');

    expect(await screen.findByRole('heading', { name: 'Visão geral' })).toBeTruthy();
  });

  it('volta para a página que a pessoa tentou abrir antes do login', async () => {
    const rotas: Rotas = {
      ...SEM_SESSAO,
      'POST /api/auth/login': () => json({ user: USUARIO }),
    };
    simularApi(rotas);
    renderizarApp({ pathname: '/login', state: { de: '/' } });
    const u = await preencher('ana@exemplo.com', SENHA);

    await u.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('heading', { name: 'Visão geral' })).toBeTruthy();
  });

  it('NÃO redireciona para endereços externos mesmo que o destino venha manipulado', async () => {
    simularApi({ ...SEM_SESSAO, 'POST /api/auth/login': () => json({ user: USUARIO }) });
    renderizarApp({ pathname: '/login', state: { de: '//site-malicioso.example/entrar' } });
    const u = await preencher('ana@exemplo.com', SENHA);

    await u.click(screen.getByRole('button', { name: 'Entrar' }));

    // Cai na tela inicial do sistema, e não no endereço malicioso.
    expect(await screen.findByRole('heading', { name: 'Visão geral' })).toBeTruthy();
  });
});

describe('Rotas protegidas', () => {
  it('sem sessão, abrir a página inicial leva ao login', async () => {
    simularApi(SEM_SESSAO);
    renderizarApp('/');

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Visão geral' })).toBeNull();
  });

  it('com sessão, mostra a tela inicial com o nome e o perfil', async () => {
    simularApi(COM_SESSAO);
    renderizarApp('/');

    expect(await screen.findByRole('heading', { name: 'Visão geral' })).toBeTruthy();
    expect(screen.getByText('Ana Teste')).toBeTruthy();
    expect(screen.getByText(/Técnico/)).toBeTruthy();
  });

  it('"Sair" encerra a sessão na API e volta ao login', async () => {
    // Depois do logout, a API passa a responder 401 em /me (os cookies foram apagados).
    let saiu = false;
    const api = simularApi({
      'GET /api/auth/me': () =>
        saiu
          ? erroDaApi(401, 'NAO_AUTENTICADO', 'Faça login para continuar.')
          : json({ user: USUARIO }),
      'POST /api/auth/refresh': () =>
        erroDaApi(401, 'NAO_AUTENTICADO', 'Faça login para continuar.'),
      'POST /api/auth/logout': () => {
        saiu = true;
        return new Response(null, { status: 204 });
      },
    });
    renderizarApp('/');
    const u = userEvent.setup();

    await u.click(await screen.findByRole('button', { name: 'Sair' }));

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeTruthy();
    expect(
      api.mock.calls.some(([url, init]) => url === '/api/auth/logout' && init?.method === 'POST'),
    ).toBe(true);
  });

  it('mostra a página "não encontrada" para endereços inexistentes', async () => {
    simularApi(SEM_SESSAO);
    renderizarApp('/qualquer-coisa-que-nao-existe');

    expect(await screen.findByRole('heading', { name: 'Página não encontrada' })).toBeTruthy();
  });
});
