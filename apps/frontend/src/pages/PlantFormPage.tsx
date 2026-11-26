import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useForm, type FieldErrors, type Resolver } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UFS, plantInputSchema, type PlantResponse } from '@solarsystem/shared';
import { ApiError } from '../api/client';
import { buscarUsina, criarUsina, editarUsina } from '../api/plants';
import { ErroDeCarga } from '../components/ErroDeCarga';
import { Button, classesDoBotao } from '../components/ui/Button';
import { SelectField } from '../components/ui/SelectField';
import { TextField } from '../components/ui/TextField';

// O formulário trabalha só com TEXTO (é o que os campos de digitação entregam).
// Na hora de validar, convertemos para os tipos certos (números, datas) e usamos o MESMO esquema Zod do servidor.
type Campos = {
  name: string;
  clientName: string;
  capacityKwp: string;
  city: string;
  state: string;
  latitude: string;
  longitude: string;
  installedOn: string;
};

// Aceita vírgula ou ponto como separador decimal (no Brasil se digita "75,5").
// Número ilegível vira NaN, e o Zod responde "Informe a capacidade..." em vez de gravar lixo.
function paraNumero(texto: string): number | undefined {
  const limpo = texto.trim();
  return limpo === '' ? undefined : Number(limpo.replace(',', '.'));
}

function paraEntrada(c: Campos) {
  const latitude = paraNumero(c.latitude);
  const longitude = paraNumero(c.longitude);
  return {
    name: c.name,
    clientName: c.clientName,
    capacityKwp: paraNumero(c.capacityKwp),
    city: c.city,
    state: c.state,
    // Campo opcional em branco = "não informado" (null), nunca zero.
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    installedOn: c.installedOn.trim() === '' ? null : c.installedOn.trim(),
  };
}

// Resolver próprio: converte, valida com o esquema compartilhado e entrega ao formulário a 1ª mensagem de cada campo.
const resolver: Resolver<Campos> = async (valores) => {
  const resultado = plantInputSchema.safeParse(paraEntrada(valores));
  if (resultado.success) return { values: valores, errors: {} };

  const errors: FieldErrors<Campos> = {};
  for (const problema of resultado.error.issues) {
    const campo = problema.path[0] as keyof Campos;
    errors[campo] ??= { type: 'validate', message: problema.message };
  }
  return { values: {}, errors };
};

function camposIniciais(usina?: PlantResponse): Campos {
  const texto = (n: number | null) => (n === null ? '' : String(n).replace('.', ','));
  return {
    name: usina?.name ?? '',
    clientName: usina?.clientName ?? '',
    capacityKwp: usina ? texto(usina.capacityKwp) : '',
    city: usina?.city ?? '',
    state: usina?.state ?? '',
    latitude: usina ? texto(usina.latitude) : '',
    longitude: usina ? texto(usina.longitude) : '',
    installedOn: usina?.installedOn ?? '',
  };
}

const CAMPOS_CONHECIDOS = new Set<string>([
  'name',
  'clientName',
  'capacityKwp',
  'city',
  'state',
  'latitude',
  'longitude',
  'installedOn',
]);

type Props = { usina?: PlantResponse };

function Formulario({ usina }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Campos>({ resolver, defaultValues: camposIniciais(usina) });

  const gravar = useMutation({
    mutationFn: (dados: ReturnType<typeof plantInputSchema.parse>) =>
      usina ? editarUsina(usina.id, dados) : criarUsina(dados),
    onSuccess: async (salva) => {
      await queryClient.invalidateQueries({ queryKey: ['plants'] });
      navigate(`/usinas/${salva.id}`, { replace: true });
    },
  });

  const aoEnviar = handleSubmit(async (valores) => {
    setErroGeral(null);
    const entrada = plantInputSchema.parse(paraEntrada(valores));
    try {
      await gravar.mutateAsync(entrada);
    } catch (erro) {
      if (!(erro instanceof ApiError)) {
        setErroGeral('Ocorreu um erro inesperado. Tente novamente.');
        return;
      }
      // Erros de validação do servidor aparecem junto do campo certo.
      let achouCampo = false;
      for (const detalhe of erro.details ?? []) {
        if (CAMPOS_CONHECIDOS.has(detalhe.field)) {
          setError(detalhe.field as keyof Campos, { type: 'server', message: detalhe.message });
          achouCampo = true;
        }
      }
      if (erro.code === 'USINA_DUPLICADA') {
        setError('name', { type: 'server', message: erro.message });
        achouCampo = true;
      }
      if (!achouCampo) setErroGeral(erro.message);
    }
  });

  return (
    <form onSubmit={aoEnviar} noValidate className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
      {erroGeral && (
        <div
          role="alert"
          className="rounded-md border border-red-700 bg-red-50 p-3 text-sm font-medium text-red-800"
        >
          {erroGeral}
        </div>
      )}

      <TextField label="Nome da usina" erro={errors.name?.message} {...register('name')} />
      <TextField label="Cliente" erro={errors.clientName?.message} {...register('clientName')} />
      <TextField
        label="Capacidade instalada (kWp)"
        inputMode="decimal"
        placeholder="Ex.: 75,5"
        erro={errors.capacityKwp?.message}
        {...register('capacityKwp')}
      />
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <TextField label="Cidade" erro={errors.city?.message} {...register('city')} />
        <SelectField label="UF" erro={errors.state?.message} {...register('state')}>
          <option value="">Selecione</option>
          {UFS.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Latitude (opcional)"
          inputMode="decimal"
          placeholder="Ex.: -16,7"
          erro={errors.latitude?.message}
          {...register('latitude')}
        />
        <TextField
          label="Longitude (opcional)"
          inputMode="decimal"
          placeholder="Ex.: -43,86"
          erro={errors.longitude?.message}
          {...register('longitude')}
        />
      </div>
      <TextField
        label="Data de instalação (opcional)"
        type="date"
        erro={errors.installedOn?.message}
        {...register('installedOn')}
      />

      <div className="flex flex-wrap gap-3 pt-2">
        <Button
          type="submit"
          larga={false}
          carregando={gravar.isPending}
          textoCarregando="Salvando..."
        >
          {usina ? 'Salvar alterações' : 'Cadastrar usina'}
        </Button>
        <Link
          to={usina ? `/usinas/${usina.id}` : '/usinas'}
          className={classesDoBotao('secundario', false)}
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

// Serve para cadastrar (/usinas/nova) e para editar (/usinas/:id/editar).
export function PlantFormPage() {
  const { id } = useParams();
  const editando = id !== undefined;

  useEffect(() => {
    document.title = `${editando ? 'Editar usina' : 'Cadastrar usina'} — SolarSystem`;
  }, [editando]);

  const consulta = useQuery({
    queryKey: ['plants', 'detalhe', id],
    queryFn: () => buscarUsina(id!),
    enabled: editando,
  });

  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">
        {editando ? 'Editar usina' : 'Cadastrar usina'}
      </h1>
      {!editando && <Formulario />}
      {editando && consulta.isPending && (
        <p role="status" className="p-4 text-slate-700">
          Carregando usina...
        </p>
      )}
      {editando && consulta.isError && (
        <ErroDeCarga erro={consulta.error} aoTentarDeNovo={() => void consulta.refetch()} />
      )}
      {editando && consulta.data && <Formulario usina={consulta.data} />}
    </>
  );
}
