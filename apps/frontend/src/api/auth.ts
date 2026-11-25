import { z } from 'zod';
import { userResponseSchema, type LoginInput, type UserResponse } from '@solarsystem/shared';
import { api, ApiError } from './client';

// A resposta da API também é validada: se o formato mudar, descobrimos na hora (e não por um erro estranho depois).
const respostaDoUsuarioSchema = z.object({ user: userResponseSchema });

export async function entrar(dados: LoginInput): Promise<UserResponse> {
  const resposta = await api('/api/auth/login', { method: 'POST', body: dados });
  return respostaDoUsuarioSchema.parse(resposta).user;
}

export async function sair(): Promise<void> {
  await api('/api/auth/logout', { method: 'POST' });
}

// Retorna o usuário logado, ou null se não houver sessão (isso não é um "erro" para a tela).
export async function buscarUsuarioLogado(): Promise<UserResponse | null> {
  try {
    const resposta = await api('/api/auth/me');
    return respostaDoUsuarioSchema.parse(resposta).user;
  } catch (erro) {
    if (erro instanceof ApiError && erro.status === 401) return null;
    throw erro;
  }
}
