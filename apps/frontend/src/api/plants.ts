import {
  plantListResponseSchema,
  plantResponseSchema,
  type PlantInput,
  type PlantListResponse,
  type PlantResponse,
} from '@solarsystem/shared';
import { api } from './client';

export type FiltrosDeUsinas = {
  q: string;
  state: string;
  // 'true' = só ativas, 'false' = só inativas, '' = todas
  active: string;
  page: number;
};

// Monta a query string só com os filtros preenchidos.
function montarQuery(filtros: FiltrosDeUsinas): string {
  const params = new URLSearchParams();
  if (filtros.q) params.set('q', filtros.q);
  if (filtros.state) params.set('state', filtros.state);
  if (filtros.active) params.set('active', filtros.active);
  params.set('page', String(filtros.page));
  return params.toString();
}

// As respostas da API são validadas com o mesmo esquema do servidor: se o formato mudar, descobrimos na hora.
export async function listarUsinas(filtros: FiltrosDeUsinas): Promise<PlantListResponse> {
  const resposta = await api(`/api/plants?${montarQuery(filtros)}`);
  return plantListResponseSchema.parse(resposta);
}

export async function buscarUsina(id: string): Promise<PlantResponse> {
  return plantResponseSchema.parse(await api(`/api/plants/${encodeURIComponent(id)}`));
}

export async function criarUsina(dados: PlantInput): Promise<PlantResponse> {
  return plantResponseSchema.parse(await api('/api/plants', { method: 'POST', body: dados }));
}

export async function editarUsina(id: string, dados: PlantInput): Promise<PlantResponse> {
  const caminho = `/api/plants/${encodeURIComponent(id)}`;
  return plantResponseSchema.parse(await api(caminho, { method: 'PUT', body: dados }));
}

export async function mudarSituacaoDaUsina(id: string, ativa: boolean): Promise<PlantResponse> {
  const acao = ativa ? 'activate' : 'deactivate';
  const caminho = `/api/plants/${encodeURIComponent(id)}/${acao}`;
  return plantResponseSchema.parse(await api(caminho, { method: 'POST' }));
}
