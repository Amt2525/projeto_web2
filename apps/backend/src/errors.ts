// Erro "esperado" da aplicação, com o status HTTP e uma mensagem segura para o usuário.
// Mensagens NUNCA devem conter detalhes internos (SQL, caminhos de arquivo, stack trace).
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: { field: string; message: string }[],
  ) {
    super(message);
  }
}

export const erros = {
  naoAutenticado: () => new AppError(401, 'NAO_AUTENTICADO', 'Faça login para continuar.'),
  semPermissao: () =>
    new AppError(403, 'SEM_PERMISSAO', 'Você não tem permissão para realizar esta ação.'),
  // Mesma mensagem para e-mail inexistente, senha errada, conta inativa ou bloqueada:
  // assim não revelamos quais e-mails existem (enumeração de usuários).
  credenciaisInvalidas: () =>
    new AppError(
      401,
      'CREDENCIAIS_INVALIDAS',
      'E-mail ou senha inválidos, ou conta temporariamente bloqueada.',
    ),
  csrf: () =>
    new AppError(403, 'REQUISICAO_NAO_AUTORIZADA', 'Requisição não autorizada pela origem.'),
  naoEncontrado: () => new AppError(404, 'NAO_ENCONTRADO', 'Recurso não encontrado.'),
  usinaDuplicada: () =>
    new AppError(409, 'USINA_DUPLICADA', 'Já existe uma usina com este nome nesta cidade e UF.'),
  dadosInvalidos: (details: { field: string; message: string }[]) =>
    new AppError(400, 'DADOS_INVALIDOS', 'Os dados informados são inválidos.', details),
};
