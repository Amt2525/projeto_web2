import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PrismaClient } from '../../db/prisma';
import {
  COOKIE_ACESSO,
  COOKIE_RENOVACAO,
  CSRF,
  SENHA_DIGITADA,
  SENHA_NOVA,
  SENHA_OUTRA,
  SENHA_PADRAO,
  cabecalhoCookie,
  criarAppDeTeste,
  criarPrismaDeTeste,
  criarUsuario,
  fazerLogin,
  limparBanco,
  valorDoCookie,
} from '../../../test/helpers';
import { hashRefreshToken } from './refresh-token';

let prisma: PrismaClient;
let app: ReturnType<typeof criarAppDeTeste>;
// Relógio controlado: os testes "avançam o tempo" mudando esta variável.
let agora: Date;
const relogio = () => agora;

beforeAll(() => {
  prisma = criarPrismaDeTeste();
});
afterAll(() => prisma.$disconnect());

beforeEach(async () => {
  await limparBanco(prisma);
  agora = new Date('2026-11-25T12:00:00.000Z');
  app = criarAppDeTeste(prisma, { now: relogio });
});
afterEach(() => app.close());

const minutos = (n: number) => n * 60 * 1000;
const dias = (n: number) => n * 24 * 60 * minutos(1);

function post(
  url: string,
  payload?: unknown,
  cookies?: string,
  headers: Record<string, string> = CSRF,
) {
  return app.inject({
    method: 'POST',
    url,
    headers: { ...headers, ...(cookies ? { cookie: cookies } : {}) },
    ...(payload !== undefined ? { payload: payload as object } : {}),
  });
}

describe('POST /api/auth/login', () => {
  it('autentica, devolve só os dados públicos do usuário e define os cookies', async () => {
    await criarUsuario(prisma);
    const { resposta } = await fazerLogin(app);

    expect(resposta.statusCode).toBe(200);
    const corpo = resposta.json();
    expect(corpo.user).toMatchObject({
      email: 'ana@exemplo.com',
      name: 'Ana Teste',
      role: 'TECNICO',
    });
    expect(Object.keys(corpo.user).sort()).toEqual(['email', 'id', 'name', 'role']);
    expect(resposta.body).not.toContain('passwordHash');
    expect(resposta.body).not.toContain('argon2');
  });

  it('os cookies são HttpOnly, SameSite=Strict e têm caminhos restritos', async () => {
    await criarUsuario(prisma);
    const { resposta } = await fazerLogin(app);
    const acesso = resposta.cookies.find((c) => c.name === COOKIE_ACESSO);
    const renovacao = resposta.cookies.find((c) => c.name === COOKIE_RENOVACAO);

    expect(acesso).toMatchObject({ httpOnly: true, sameSite: 'Strict', path: '/api' });
    expect(renovacao).toMatchObject({ httpOnly: true, sameSite: 'Strict', path: '/api/auth' });
    expect(acesso?.maxAge).toBe(15 * 60);
    expect(renovacao?.maxAge).toBe(7 * 24 * 60 * 60);
  });

  it('em produção os cookies também são Secure', async () => {
    await criarUsuario(prisma);
    await app.close();
    app = criarAppDeTeste(prisma, { env: { NODE_ENV: 'production' }, now: relogio });
    const { resposta } = await fazerLogin(app);

    for (const cookie of resposta.cookies) expect(cookie.secure).toBe(true);
  });

  it('guarda no banco só o hash do refresh token, nunca o token', async () => {
    await criarUsuario(prisma);
    const { resposta } = await fazerLogin(app);
    const token = valorDoCookie(resposta.cookies, COOKIE_RENOVACAO)!;

    const guardados = await prisma.refreshToken.findMany();
    expect(guardados).toHaveLength(1);
    expect(guardados[0]!.tokenHash).toBe(hashRefreshToken(token));
    expect(guardados[0]!.tokenHash).not.toBe(token);
  });

  it('rejeita senha errada com 401 genérico', async () => {
    await criarUsuario(prisma);
    const { resposta } = await fazerLogin(app, 'ana@exemplo.com', 'senha-errada-qualquer-1');

    expect(resposta.statusCode).toBe(401);
    expect(resposta.json().error.code).toBe('CREDENCIAIS_INVALIDAS');
    expect(resposta.cookies).toHaveLength(0);
  });

  it('não revela se o e-mail existe: resposta idêntica para e-mail inexistente e senha errada', async () => {
    await criarUsuario(prisma);
    const senhaErrada = await fazerLogin(app, 'ana@exemplo.com', 'senha-errada-qualquer-1');
    const emailInexistente = await fazerLogin(
      app,
      'fantasma@exemplo.com',
      'senha-errada-qualquer-1',
    );

    expect(emailInexistente.resposta.statusCode).toBe(senhaErrada.resposta.statusCode);
    expect(emailInexistente.resposta.json()).toEqual(senhaErrada.resposta.json());
  });

  it('usuário inativo não consegue entrar, com a mesma resposta genérica', async () => {
    await criarUsuario(prisma, { isActive: false });
    const { resposta } = await fazerLogin(app);

    expect(resposta.statusCode).toBe(401);
    expect(resposta.json().error.code).toBe('CREDENCIAIS_INVALIDAS');
  });

  it('ignora maiúsculas e espaços no e-mail', async () => {
    await criarUsuario(prisma);
    const { resposta } = await fazerLogin(app, '  ANA@Exemplo.COM ');
    expect(resposta.statusCode).toBe(200);
  });

  it('valida a entrada: campos ausentes, tipos errados, e-mail inválido e senha gigante', async () => {
    const casos: unknown[] = [
      {},
      { email: 'ana@exemplo.com' },
      { password: 'x' },
      { email: 'nao-e-email', password: 'x' },
      { email: 123, password: 'x' },
      { email: 'ana@exemplo.com', password: ['x'] },
      { email: 'ana@exemplo.com', password: 'a'.repeat(129) },
      { email: { $ne: null }, password: { $ne: null } },
    ];
    for (const caso of casos) {
      const resposta = await post('/api/auth/login', caso);
      expect(resposta.statusCode, JSON.stringify(caso)).toBe(400);
      expect(resposta.json().error.code).toBe('DADOS_INVALIDOS');
    }
  });

  it('rejeita campos inesperados (proteção contra mass assignment)', async () => {
    await criarUsuario(prisma);
    const resposta = await post('/api/auth/login', {
      email: 'ana@exemplo.com',
      password: SENHA_PADRAO,
      role: 'ADMIN',
    });
    expect(resposta.statusCode).toBe(400);
  });

  it('tentativas de SQL Injection não causam erro nem acesso', async () => {
    await criarUsuario(prisma);
    const noEmail = await post('/api/auth/login', { email: "' OR '1'='1' --", password: 'x' });
    expect(noEmail.statusCode).toBe(400);

    const naSenha = await fazerLogin(app, 'ana@exemplo.com', "' OR '1'='1");
    expect(naSenha.resposta.statusCode).toBe(401);

    // E a tabela continua intacta.
    expect(await prisma.user.count()).toBe(1);
  });

  it('o erro de validação não devolve o valor digitado (a senha)', async () => {
    const resposta = await post('/api/auth/login', {
      email: 'nao-e-email',
      password: SENHA_DIGITADA,
    });
    expect(resposta.statusCode).toBe(400);
    expect(resposta.body).not.toContain(SENHA_DIGITADA);
  });

  it('rejeita JSON malformado e corpo grande demais', async () => {
    const malformado = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { ...CSRF, 'content-type': 'application/json' },
      payload: '{ isto nao e json',
    });
    expect(malformado.statusCode).toBe(400);
    expect(malformado.json().error.code).toBe('REQUISICAO_INVALIDA');

    const grande = await post('/api/auth/login', { email: 'a@b.co', password: 'x'.repeat(20_000) });
    expect(grande.statusCode).toBe(413);
  });

  it('tolera Content-Type JSON com corpo vazio onde não há corpo (logout), mas o login continua exigindo os campos', async () => {
    const cabecalhos = { ...CSRF, 'content-type': 'application/json' };
    const logout = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: cabecalhos,
    });
    expect(logout.statusCode).toBe(204);

    const login = await app.inject({ method: 'POST', url: '/api/auth/login', headers: cabecalhos });
    expect(login.statusCode).toBe(400);
    expect(login.json().error.code).toBe('DADOS_INVALIDOS');
  });

  it('rejeita envenenamento de protótipo ("__proto__" no JSON)', async () => {
    await criarUsuario(prisma);
    const resposta = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { ...CSRF, 'content-type': 'application/json' },
      payload: `{"email":"ana@exemplo.com","password":"${SENHA_PADRAO}","__proto__":{"role":"ADMIN"}}`,
    });
    expect(resposta.statusCode).toBe(400);
  });

  it('só aceita JSON: outros tipos de conteúdo são recusados', async () => {
    const resposta = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      headers: { ...CSRF, 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'email=ana@exemplo.com&password=x',
    });
    expect(resposta.statusCode).toBe(400);
  });

  it('limita as tentativas por IP (429 na 11ª em um minuto)', async () => {
    const codigos: number[] = [];
    for (let i = 0; i < 11; i++) {
      const { resposta } = await fazerLogin(app, `fantasma${i}@exemplo.com`, 'qualquer-senha-1');
      codigos.push(resposta.statusCode);
    }
    expect(codigos.slice(0, 10).every((c) => c === 401)).toBe(true);
    expect(codigos[10]).toBe(429);
  });
});

describe('proteção CSRF', () => {
  it('rejeita requisição que altera dados sem o cabeçalho X-Requested-By', async () => {
    await criarUsuario(prisma);
    const resposta = await post(
      '/api/auth/login',
      { email: 'ana@exemplo.com', password: SENHA_PADRAO },
      undefined,
      {},
    );
    expect(resposta.statusCode).toBe(403);
    expect(resposta.json().error.code).toBe('REQUISICAO_NAO_AUTORIZADA');
  });

  it('rejeita Origin de outro site, mesmo com o cabeçalho correto', async () => {
    await criarUsuario(prisma);
    const resposta = await post(
      '/api/auth/login',
      { email: 'ana@exemplo.com', password: SENHA_PADRAO },
      undefined,
      {
        ...CSRF,
        origin: 'https://site-malicioso.example',
      },
    );
    expect(resposta.statusCode).toBe(403);
  });

  it('aceita o Origin do nosso front-end', async () => {
    await criarUsuario(prisma);
    const resposta = await post(
      '/api/auth/login',
      { email: 'ana@exemplo.com', password: SENHA_PADRAO },
      undefined,
      {
        ...CSRF,
        origin: 'http://localhost:5173',
      },
    );
    expect(resposta.statusCode).toBe(200);
  });

  it('logout e troca de senha também exigem o cabeçalho', async () => {
    await criarUsuario(prisma);
    const { cookies } = await fazerLogin(app);
    expect((await post('/api/auth/logout', undefined, cookies, {})).statusCode).toBe(403);
    expect((await post('/api/auth/change-password', {}, cookies, {})).statusCode).toBe(403);
  });
});

describe('bloqueio de conta (força bruta)', () => {
  it('bloqueia após 5 falhas seguidas, mesmo com a senha certa, e libera depois de 15 minutos', async () => {
    await criarUsuario(prisma);
    for (let i = 0; i < 5; i++) {
      const { resposta } = await fazerLogin(app, 'ana@exemplo.com', 'senha-errada-qualquer-1');
      expect(resposta.statusCode).toBe(401);
    }

    const usuario = await prisma.user.findUniqueOrThrow({ where: { email: 'ana@exemplo.com' } });
    expect(usuario.lockedUntil).not.toBeNull();

    // Senha CERTA, mas conta bloqueada: mesma resposta genérica.
    const bloqueado = await fazerLogin(app);
    expect(bloqueado.resposta.statusCode).toBe(401);
    expect(bloqueado.resposta.json().error.code).toBe('CREDENCIAIS_INVALIDAS');

    agora = new Date(agora.getTime() + minutos(14));
    expect((await fazerLogin(app)).resposta.statusCode).toBe(401);

    agora = new Date(agora.getTime() + minutos(2));
    expect((await fazerLogin(app)).resposta.statusCode).toBe(200);

    const depois = await prisma.user.findUniqueOrThrow({ where: { email: 'ana@exemplo.com' } });
    expect(depois.failedLoginAttempts).toBe(0);
    expect(depois.lockedUntil).toBeNull();
  });

  it('um login bem-sucedido zera o contador de falhas', async () => {
    await criarUsuario(prisma);
    for (let i = 0; i < 4; i++) await fazerLogin(app, 'ana@exemplo.com', 'senha-errada-qualquer-1');
    expect((await fazerLogin(app)).resposta.statusCode).toBe(200);
    const usuario = await prisma.user.findUniqueOrThrow({ where: { email: 'ana@exemplo.com' } });
    expect(usuario.failedLoginAttempts).toBe(0);
  });
});

describe('GET /api/auth/me', () => {
  it('sem cookie: 401', async () => {
    const resposta = await app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(resposta.statusCode).toBe(401);
    expect(resposta.json().error.code).toBe('NAO_AUTENTICADO');
  });

  it('com sessão válida: devolve o usuário', async () => {
    await criarUsuario(prisma);
    const { cookies } = await fazerLogin(app);
    const resposta = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: cookies },
    });
    expect(resposta.statusCode).toBe(200);
    expect(resposta.json().user.email).toBe('ana@exemplo.com');
  });

  it('JWT expirado: 401', async () => {
    await criarUsuario(prisma);
    const { cookies } = await fazerLogin(app);
    agora = new Date(agora.getTime() + minutos(16));
    const resposta = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: cookies },
    });
    expect(resposta.statusCode).toBe(401);
  });

  it('JWT adulterado ou lixo: 401', async () => {
    await criarUsuario(prisma);
    const { resposta: login } = await fazerLogin(app);
    const token = valorDoCookie(login.cookies, COOKIE_ACESSO)!;
    for (const invalido of [token.slice(0, -4) + 'aaaa', 'lixo', 'a.b.c']) {
      const resposta = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { cookie: `${COOKIE_ACESSO}=${invalido}` },
      });
      expect(resposta.statusCode).toBe(401);
    }
  });

  it('usuário desativado depois do login perde o acesso na próxima consulta', async () => {
    await criarUsuario(prisma);
    const { cookies } = await fazerLogin(app);
    await prisma.user.update({ where: { email: 'ana@exemplo.com' }, data: { isActive: false } });

    const resposta = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: cookies },
    });
    expect(resposta.statusCode).toBe(401);
  });
});

describe('POST /api/auth/refresh (rotação de tokens)', () => {
  it('troca o refresh token por um par novo e marca o antigo como usado', async () => {
    await criarUsuario(prisma);
    const { resposta: login, cookies } = await fazerLogin(app);
    const antigo = valorDoCookie(login.cookies, COOKIE_RENOVACAO)!;

    const resposta = await post('/api/auth/refresh', undefined, cookies);
    expect(resposta.statusCode).toBe(200);
    const novo = valorDoCookie(resposta.cookies, COOKIE_RENOVACAO)!;
    expect(novo).not.toBe(antigo);

    const registro = await prisma.refreshToken.findUniqueOrThrow({
      where: { tokenHash: hashRefreshToken(antigo) },
    });
    expect(registro.usedAt).not.toBeNull();
    // O token novo pertence à MESMA família (sessão).
    const registroNovo = await prisma.refreshToken.findUniqueOrThrow({
      where: { tokenHash: hashRefreshToken(novo) },
    });
    expect(registroNovo.familyId).toBe(registro.familyId);
  });

  it('REUSO: apresentar de novo um token já usado revoga a sessão inteira', async () => {
    await criarUsuario(prisma);
    const { cookies: cookiesR1 } = await fazerLogin(app);

    const r2 = await post('/api/auth/refresh', undefined, cookiesR1);
    expect(r2.statusCode).toBe(200);
    const cookiesR2 = cabecalhoCookie(r2.cookies);

    // Um atacante (ou outra aba) usa o token ANTIGO de novo.
    const reuso = await post('/api/auth/refresh', undefined, cookiesR1);
    expect(reuso.statusCode).toBe(401);

    // O token novo, que era legítimo, também deixou de funcionar: a família inteira foi revogada.
    const aposReuso = await post('/api/auth/refresh', undefined, cookiesR2);
    expect(aposReuso.statusCode).toBe(401);

    const ativos = await prisma.refreshToken.count({ where: { revokedAt: null } });
    expect(ativos).toBe(0);
    const auditoria = await prisma.auditLog.findMany({ where: { action: 'REFRESH_REUTILIZADO' } });
    expect(auditoria).toHaveLength(1);
  });

  it('duas renovações simultâneas com o mesmo token: só uma vence (atomicidade)', async () => {
    await criarUsuario(prisma);
    const { cookies } = await fazerLogin(app);

    const [a, b] = await Promise.all([
      post('/api/auth/refresh', undefined, cookies),
      post('/api/auth/refresh', undefined, cookies),
    ]);
    expect([a.statusCode, b.statusCode].sort()).toEqual([200, 401]);
  });

  it('refresh token expirado: 401', async () => {
    await criarUsuario(prisma);
    const { cookies } = await fazerLogin(app);
    agora = new Date(agora.getTime() + dias(8));
    expect((await post('/api/auth/refresh', undefined, cookies)).statusCode).toBe(401);
  });

  it('sem cookie, desconhecido ou lixo: 401 e limpa os cookies', async () => {
    const semCookie = await post('/api/auth/refresh');
    expect(semCookie.statusCode).toBe(401);

    const lixo = await post(
      '/api/auth/refresh',
      undefined,
      `${COOKIE_RENOVACAO}=token-que-nao-existe`,
    );
    expect(lixo.statusCode).toBe(401);
    const limpou = lixo.cookies.filter((c) => c.value === '');
    expect(limpou.map((c) => c.name).sort()).toEqual([COOKIE_ACESSO, COOKIE_RENOVACAO].sort());
  });

  it('usuário desativado não consegue renovar a sessão', async () => {
    await criarUsuario(prisma);
    const { cookies } = await fazerLogin(app);
    await prisma.user.update({ where: { email: 'ana@exemplo.com' }, data: { isActive: false } });
    expect((await post('/api/auth/refresh', undefined, cookies)).statusCode).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('encerra a sessão: o refresh token deixa de funcionar e os cookies são apagados', async () => {
    await criarUsuario(prisma);
    const { cookies } = await fazerLogin(app);

    const resposta = await post('/api/auth/logout', undefined, cookies);
    expect(resposta.statusCode).toBe(204);
    expect(resposta.cookies.every((c) => c.value === '')).toBe(true);

    expect((await post('/api/auth/refresh', undefined, cookies)).statusCode).toBe(401);
  });

  it('é idempotente: sair sem sessão também retorna 204', async () => {
    expect((await post('/api/auth/logout')).statusCode).toBe(204);
  });

  it('LIMITAÇÃO DOCUMENTADA: o JWT de acesso continua válido até expirar após o logout, mas rotas sensíveis o recusam', async () => {
    await criarUsuario(prisma);
    const { cookies } = await fazerLogin(app);
    await post('/api/auth/logout', undefined, cookies);

    // Rota comum: o JWT ainda vale (risco residual, no máximo 15 minutos).
    const me = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: cookies },
    });
    expect(me.statusCode).toBe(200);

    // Rota sensível: confere a sessão no banco e recusa.
    const troca = await post(
      '/api/auth/change-password',
      { currentPassword: SENHA_PADRAO, newPassword: SENHA_OUTRA },
      cookies,
    );
    expect(troca.statusCode).toBe(401);
  });
});

describe('POST /api/auth/change-password', () => {
  const nova = SENHA_NOVA;

  it('exige autenticação', async () => {
    const resposta = await post('/api/auth/change-password', {
      currentPassword: 'x',
      newPassword: nova,
    });
    expect(resposta.statusCode).toBe(401);
  });

  it('troca a senha, encerra as outras sessões e mantém a atual', async () => {
    await criarUsuario(prisma);
    const outroDispositivo = await fazerLogin(app);
    const { cookies } = await fazerLogin(app);

    const resposta = await post(
      '/api/auth/change-password',
      { currentPassword: SENHA_PADRAO, newPassword: nova },
      cookies,
    );
    expect(resposta.statusCode).toBe(204);

    // Sessão do outro dispositivo foi encerrada.
    expect((await post('/api/auth/refresh', undefined, outroDispositivo.cookies)).statusCode).toBe(
      401,
    );
    // A sessão que trocou a senha continua funcionando, com os cookies novos.
    const novosCookies = cabecalhoCookie(resposta.cookies);
    expect((await post('/api/auth/refresh', undefined, novosCookies)).statusCode).toBe(200);

    // A senha antiga não funciona mais e a nova funciona.
    expect((await fazerLogin(app, 'ana@exemplo.com', SENHA_PADRAO)).resposta.statusCode).toBe(401);
    expect((await fazerLogin(app, 'ana@exemplo.com', nova)).resposta.statusCode).toBe(200);
  });

  it('rejeita a senha atual errada (e conta como tentativa falha)', async () => {
    await criarUsuario(prisma);
    const { cookies } = await fazerLogin(app);
    const resposta = await post(
      '/api/auth/change-password',
      { currentPassword: 'errada-bem-longa-1', newPassword: nova },
      cookies,
    );

    expect(resposta.statusCode).toBe(400);
    expect(resposta.json().error.code).toBe('SENHA_ATUAL_INCORRETA');
    const usuario = await prisma.user.findUniqueOrThrow({ where: { email: 'ana@exemplo.com' } });
    expect(usuario.failedLoginAttempts).toBe(1);
  });

  it('aplica a política: curta, comum, igual à atual ou contendo o e-mail', async () => {
    await criarUsuario(prisma, { email: 'ana.silva@exemplo.com' });
    const { cookies } = await fazerLogin(app, 'ana.silva@exemplo.com');

    const novasInvalidas = ['curta-1', 'password1234', SENHA_PADRAO, 'minha-ana.silva-2026'];
    for (const newPassword of novasInvalidas) {
      const resposta = await post(
        '/api/auth/change-password',
        { currentPassword: SENHA_PADRAO, newPassword },
        cookies,
      );
      expect(resposta.statusCode, newPassword).toBe(400);
    }
    // A senha não mudou.
    expect((await fazerLogin(app, 'ana.silva@exemplo.com')).resposta.statusCode).toBe(200);
  });
});

describe('autorização por perfil (RBAC)', () => {
  beforeEach(() => {
    app.get(
      '/api/_teste/somente-admin',
      { preHandler: [app.guards.requireAuth, app.guards.requireRole('ADMIN')] },
      async () => ({ ok: true }),
    );
  });

  it('sem login: 401', async () => {
    const resposta = await app.inject({ method: 'GET', url: '/api/_teste/somente-admin' });
    expect(resposta.statusCode).toBe(401);
  });

  it('técnico em rota de admin: 403', async () => {
    await criarUsuario(prisma, { role: 'TECNICO' });
    const { cookies } = await fazerLogin(app);
    const resposta = await app.inject({
      method: 'GET',
      url: '/api/_teste/somente-admin',
      headers: { cookie: cookies },
    });
    expect(resposta.statusCode).toBe(403);
    expect(resposta.json().error.code).toBe('SEM_PERMISSAO');
  });

  it('admin em rota de admin: 200', async () => {
    await criarUsuario(prisma, { role: 'ADMIN' });
    const { cookies } = await fazerLogin(app);
    const resposta = await app.inject({
      method: 'GET',
      url: '/api/_teste/somente-admin',
      headers: { cookie: cookies },
    });
    expect(resposta.statusCode).toBe(200);
  });

  it('não há como virar admin mexendo no cookie: o perfil vem do JWT assinado', async () => {
    await criarUsuario(prisma, { role: 'TECNICO' });
    const { resposta: login } = await fazerLogin(app);
    const token = valorDoCookie(login.cookies, COOKIE_ACESSO)!;
    const [cabecalho, conteudo, assinatura] = token.split('.');
    const dados = JSON.parse(Buffer.from(conteudo!, 'base64url').toString());
    dados.role = 'ADMIN';
    const adulterado = `${cabecalho}.${Buffer.from(JSON.stringify(dados)).toString('base64url')}.${assinatura}`;

    const resposta = await app.inject({
      method: 'GET',
      url: '/api/_teste/somente-admin',
      headers: { cookie: `${COOKIE_ACESSO}=${adulterado}` },
    });
    expect(resposta.statusCode).toBe(401);
  });
});

describe('auditoria', () => {
  it('registra login com sucesso e falhas, sem gravar senhas', async () => {
    await criarUsuario(prisma);
    await fazerLogin(app, 'ana@exemplo.com', 'MinhaSenhaErrada-123');
    await fazerLogin(app, 'fantasma@exemplo.com', 'MinhaSenhaErrada-123');
    await fazerLogin(app);

    const eventos = await prisma.auditLog.findMany({ orderBy: { occurredAt: 'asc' } });
    expect(eventos.map((e) => e.action)).toEqual(['LOGIN_FALHA', 'LOGIN_FALHA', 'LOGIN_SUCESSO']);
    // E-mail inexistente: sem usuário associado.
    expect(eventos[1]!.userId).toBeNull();
    expect(eventos[1]!.metadata).toMatchObject({ motivo: 'USUARIO_INEXISTENTE' });
    // Nada de segredo no registro.
    expect(JSON.stringify(eventos)).not.toContain('MinhaSenhaErrada-123');
    expect(JSON.stringify(eventos)).not.toContain('argon2');
  });

  it('registra o bloqueio de conta, o logout e a troca de senha', async () => {
    await criarUsuario(prisma);
    for (let i = 0; i < 5; i++) await fazerLogin(app, 'ana@exemplo.com', 'senha-errada-qualquer-1');
    agora = new Date(agora.getTime() + minutos(16));
    const { cookies } = await fazerLogin(app);
    await post(
      '/api/auth/change-password',
      { currentPassword: SENHA_PADRAO, newPassword: SENHA_NOVA },
      cookies,
    );
    await post('/api/auth/logout', undefined, cookies);

    const acoes = (await prisma.auditLog.findMany()).map((e) => e.action);
    expect(acoes).toContain('CONTA_BLOQUEADA');
    expect(acoes).toContain('SENHA_ALTERADA');
  });
});
