import { z } from 'zod';

// As 27 unidades da federação (UF). Usadas na validação e no filtro da lista.
export const UFS = [
  'AC',
  'AL',
  'AM',
  'AP',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MG',
  'MS',
  'MT',
  'PA',
  'PB',
  'PE',
  'PI',
  'PR',
  'RJ',
  'RN',
  'RO',
  'RR',
  'RS',
  'SC',
  'SE',
  'SP',
  'TO',
] as const;

export const ufSchema = z
  .string({ error: 'Informe a UF.' })
  .trim()
  .toUpperCase()
  .pipe(z.enum(UFS, { error: 'Informe uma UF válida (ex.: MG).' }));

// Capacidade máxima aceita: 100.000 kWp (100 MWp). Acima disso é quase certamente erro de digitação.
export const CAPACIDADE_MAX_KWP = 100_000;

// Converte kWp (como a pessoa digita) em Wp inteiros (como o banco guarda). 1 kWp = 1000 Wp.
// Math.round evita o erro clássico de ponto flutuante (ex.: 0.29 * 1000 = 290.00000000000006).
export function kwpParaWp(kwp: number): number {
  return Math.round(kwp * 1000);
}

export function wpParaKwp(wp: number): number {
  return wp / 1000;
}

// Texto como "2026-11-25" só é aceito se for uma data que existe de verdade (rejeita 2026-02-31).
function dataValida(texto: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const data = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === texto;
}

// Dados que uma pessoa informa ao cadastrar ou editar uma usina.
// strictObject: qualquer campo que não esteja aqui (id, isActive, createdBy...) é REJEITADO.
export const plantInputSchema = z
  .strictObject({
    name: z
      .string({ error: 'Informe o nome da usina.' })
      .trim()
      .min(3, 'O nome deve ter pelo menos 3 caracteres.')
      .max(120, 'O nome deve ter no máximo 120 caracteres.'),
    clientName: z
      .string({ error: 'Informe o cliente.' })
      .trim()
      .min(2, 'O cliente deve ter pelo menos 2 caracteres.')
      .max(120, 'O cliente deve ter no máximo 120 caracteres.'),
    // Em kWp, como se fala no dia a dia. O servidor converte para Wp inteiro.
    capacityKwp: z
      .number({ error: 'Informe a capacidade em kWp.' })
      .positive('A capacidade deve ser maior que zero.')
      .max(CAPACIDADE_MAX_KWP, `A capacidade deve ser no máximo ${CAPACIDADE_MAX_KWP} kWp.`)
      .refine((kwp) => Math.abs(kwp * 1000 - kwpParaWp(kwp)) < 1e-6, {
        message: 'Use no máximo 3 casas decimais.',
      }),
    city: z
      .string({ error: 'Informe a cidade.' })
      .trim()
      .min(2, 'A cidade deve ter pelo menos 2 caracteres.')
      .max(100, 'A cidade deve ter no máximo 100 caracteres.'),
    state: ufSchema,
    latitude: z
      .number({ error: 'A latitude deve ser um número.' })
      .min(-90, 'A latitude deve estar entre -90 e 90.')
      .max(90, 'A latitude deve estar entre -90 e 90.')
      .nullable(),
    longitude: z
      .number({ error: 'A longitude deve ser um número.' })
      .min(-180, 'A longitude deve estar entre -180 e 180.')
      .max(180, 'A longitude deve estar entre -180 e 180.')
      .nullable(),
    installedOn: z
      .string({ error: 'Informe uma data válida.' })
      .refine(dataValida, 'Informe uma data válida.')
      .refine(
        // Tolerância de 1 dia: o servidor está em UTC e o usuário no Brasil (UTC-3).
        (texto) => new Date(`${texto}T00:00:00Z`).getTime() <= Date.now() + 24 * 3600 * 1000,
        'A data de instalação não pode estar no futuro.',
      )
      .nullable(),
  })
  // Coordenadas: ou as duas, ou nenhuma (uma sozinha não localiza nada).
  .refine((d) => (d.latitude === null) === (d.longitude === null), {
    path: ['longitude'],
    message: 'Informe latitude e longitude juntas, ou deixe as duas em branco.',
  });
export type PlantInput = z.infer<typeof plantInputSchema>;

// Parâmetros da lista (vêm na URL, sempre como texto: por isso o "coerce").
export const plantListQuerySchema = z.strictObject({
  q: z.string().trim().max(100, 'A busca deve ter no máximo 100 caracteres.').optional(),
  state: ufSchema.optional(),
  active: z
    .enum(['true', 'false'], { error: 'O filtro de situação deve ser true ou false.' })
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});
export type PlantListQuery = z.infer<typeof plantListQuerySchema>;

export const plantIdParamsSchema = z.strictObject({
  id: z.uuid({ error: 'Identificador inválido.' }),
});

// O que a API devolve sobre uma usina (DTO). Não inclui quem criou nem nada interno.
export const plantResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  clientName: z.string(),
  capacityKwp: z.number(),
  city: z.string(),
  state: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  installedOn: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PlantResponse = z.infer<typeof plantResponseSchema>;

export const plantListResponseSchema = z.object({
  items: z.array(plantResponseSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});
export type PlantListResponse = z.infer<typeof plantListResponseSchema>;
