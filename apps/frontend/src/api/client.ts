// Cliente HTTP do front-end. Toda conversa com a API passa por aqui.
// Ele cuida de: cabeçalho anti-CSRF, JSON, erros padronizados e renovação automática da sessão.

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: { field: string; message: string }[],
  ) {
    super(message);
  }
}

type Opcoes = { method?: 'GET' | 'POST'; body?: unknown };

// Rotas em que um 401 NÃO deve disparar a renovação da sessão:
// no login, 401 significa "senha errada"; e renovar a renovação ou o logout não faz sentido.
const SEM_RENOVACAO = new Set(['/api/auth/login', '/api/auth/refresh', '/api/auth/logout']);

function enviar(caminho: string, { method = 'GET', body }: Opcoes): Promise<Response> {
  const cabecalhos: Record<string, string> = {};
  // O servidor exige este cabeçalho em tudo que altera dados (defesa contra CSRF).
  if (method !== 'GET') cabecalhos['X-Requested-By'] = 'solarsystem-web';
  // Só declaramos JSON quando há corpo.
  if (body !== undefined) cabecalhos['Content-Type'] = 'application/json';

  return fetch(caminho, {
    method,
    headers: cabecalhos,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    // Envia os cookies da sessão (HttpOnly: o JavaScript não os enxerga, só o navegador).
    credentials: 'same-origin',
  });
}

// Várias requisições podem receber 401 ao mesmo tempo (JWT expirou). Todas esperam UMA só renovação.
// Isso é importante: o refresh token vale uma vez; renovar duas vezes derrubaria a sessão.
let renovacaoEmAndamento: Promise<boolean> | null = null;

function renovarSessao(): Promise<boolean> {
  renovacaoEmAndamento ??= enviar('/api/auth/refresh', { method: 'POST' })
    .then((resposta) => resposta.ok)
    .catch(() => false)
    .finally(() => {
      renovacaoEmAndamento = null;
    });
  return renovacaoEmAndamento;
}

async function erroDaResposta(resposta: Response): Promise<ApiError> {
  const corpo: unknown = await resposta.json().catch(() => null);
  const erro = (
    corpo as { error?: { code?: string; message?: string; details?: ApiError['details'] } } | null
  )?.error;
  return new ApiError(
    resposta.status,
    erro?.code ?? 'ERRO_DESCONHECIDO',
    erro?.message ?? 'Não foi possível concluir a operação. Tente novamente.',
    erro?.details,
  );
}

export async function api<T = unknown>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  let resposta: Response;
  try {
    resposta = await enviar(caminho, opcoes);
    if (resposta.status === 401 && !SEM_RENOVACAO.has(caminho) && (await renovarSessao())) {
      resposta = await enviar(caminho, opcoes);
    }
  } catch {
    throw new ApiError(
      0,
      'SEM_CONEXAO',
      'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
    );
  }

  if (!resposta.ok) throw await erroDaResposta(resposta);
  if (resposta.status === 204) return undefined as T;
  return (await resposta.json()) as T;
}
