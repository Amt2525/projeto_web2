import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../errors';

// Tratamento CENTRALIZADO de erros: todo erro vira uma resposta no mesmo formato,
//   { "error": { "code": "...", "message": "...", "details": [...] } }
// e nenhum detalhe interno (stack trace, SQL) chega ao cliente.
export function registerErrorHandler(app: FastifyInstance) {
  app.setNotFoundHandler((_request, reply) => {
    return reply
      .status(404)
      .send({ error: { code: 'NAO_ENCONTRADO', message: 'Recurso não encontrado.' } });
  });

  app.setErrorHandler((erro, request, reply) => {
    if (erro instanceof AppError) {
      return reply.status(erro.statusCode).send({
        error: {
          code: erro.code,
          message: erro.message,
          ...(erro.details ? { details: erro.details } : {}),
        },
      });
    }

    if (erro instanceof ZodError) {
      // Só campo e mensagem: o valor digitado (que pode ser uma senha) nunca volta na resposta.
      const details = erro.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
      return reply.status(400).send({
        error: { code: 'DADOS_INVALIDOS', message: 'Os dados informados são inválidos.', details },
      });
    }

    const status = (erro as { statusCode?: number }).statusCode;

    if (status === 429) {
      return reply.status(429).send({
        error: {
          code: 'MUITAS_REQUISICOES',
          message: 'Muitas tentativas. Aguarde um pouco e tente novamente.',
        },
      });
    }
    if (status === 413) {
      return reply.status(413).send({
        error: { code: 'CORPO_MUITO_GRANDE', message: 'O conteúdo enviado é grande demais.' },
      });
    }
    if (status !== undefined && status >= 400 && status < 500) {
      // Ex.: JSON malformado, tipo de conteúdo não suportado.
      return reply.status(400).send({
        error: { code: 'REQUISICAO_INVALIDA', message: 'A requisição é inválida.' },
      });
    }

    // Erro inesperado: registramos no log (com os campos sensíveis ocultos) e devolvemos algo genérico.
    request.log.error({ err: erro }, 'Erro inesperado');
    return reply.status(500).send({
      error: { code: 'ERRO_INTERNO', message: 'Ocorreu um erro inesperado. Tente novamente.' },
    });
  });
}
