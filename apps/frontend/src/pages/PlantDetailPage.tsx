import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import { buscarUsina, mudarSituacaoDaUsina } from '../api/plants';
import { ErroDeCarga } from '../components/ErroDeCarga';
import { Button, classesDoBotao } from '../components/ui/Button';
import { formatarCoordenada, formatarData, formatarKwp } from '../lib/formatar';

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-sm font-medium text-slate-700">{rotulo}</dt>
      <dd className="text-base text-slate-900">{valor}</dd>
    </div>
  );
}

export function PlantDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [confirmando, setConfirmando] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  const consulta = useQuery({
    queryKey: ['plants', 'detalhe', id],
    queryFn: () => buscarUsina(id!),
  });

  useEffect(() => {
    document.title = `${consulta.data?.name ?? 'Usina'} — SolarSystem`;
  }, [consulta.data?.name]);

  const mudar = useMutation({
    mutationFn: (ativa: boolean) => mudarSituacaoDaUsina(id!, ativa),
    onSuccess: async () => {
      setConfirmando(false);
      await queryClient.invalidateQueries({ queryKey: ['plants'] });
    },
    onError: (erro) => {
      setErroAcao(erro instanceof ApiError ? erro.message : 'Ocorreu um erro inesperado.');
    },
  });

  if (consulta.isPending) {
    return (
      <p role="status" className="p-4 text-slate-700">
        Carregando usina...
      </p>
    );
  }

  if (consulta.isError) {
    if (consulta.error instanceof ApiError && consulta.error.status === 404) {
      return (
        <>
          <h1 className="mb-2 text-2xl font-semibold">Usina não encontrada</h1>
          <Link to="/usinas" className="font-medium text-blue-800 underline">
            Voltar para a lista de usinas
          </Link>
        </>
      );
    }
    return <ErroDeCarga erro={consulta.error} aoTentarDeNovo={() => void consulta.refetch()} />;
  }

  const usina = consulta.data;

  return (
    <>
      <p className="mb-2 text-sm">
        <Link to="/usinas" className="font-medium text-blue-800 underline">
          ← Usinas
        </Link>
      </p>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{usina.name}</h1>
        <p className="rounded-md border border-slate-500 bg-white px-3 py-1 text-sm font-medium">
          {usina.isActive ? 'Ativa' : 'Inativa'}
        </p>
      </div>

      <section aria-label="Dados da usina" className="rounded-xl bg-white p-6 shadow-sm">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Dado rotulo="Cliente" valor={usina.clientName} />
          <Dado rotulo="Capacidade instalada" valor={formatarKwp(usina.capacityKwp)} />
          <Dado rotulo="Cidade/UF" valor={`${usina.city}/${usina.state}`} />
          <Dado rotulo="Data de instalação" valor={formatarData(usina.installedOn)} />
          <Dado rotulo="Latitude" valor={formatarCoordenada(usina.latitude)} />
          <Dado rotulo="Longitude" valor={formatarCoordenada(usina.longitude)} />
        </dl>
        <p className="mt-6 text-sm text-slate-700">
          Os dados de produção, inversores e alarmes ainda não existem: serão adicionados nas
          próximas etapas.
        </p>
      </section>

      {erroAcao && (
        <div
          role="alert"
          className="mt-4 rounded-md border border-red-700 bg-red-50 p-3 text-sm font-medium text-red-800"
        >
          {erroAcao}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <Link to={`/usinas/${usina.id}/editar`} className={classesDoBotao('primario', false)}>
          Editar
        </Link>
        {usina.isActive ? (
          <Button
            variante="secundario"
            larga={false}
            onClick={() => {
              setErroAcao(null);
              setConfirmando(true);
            }}
          >
            Desativar usina
          </Button>
        ) : (
          <Button
            variante="secundario"
            larga={false}
            carregando={mudar.isPending}
            textoCarregando="Reativando..."
            onClick={() => {
              setErroAcao(null);
              mudar.mutate(true);
            }}
          >
            Reativar usina
          </Button>
        )}
      </div>

      {confirmando && usina.isActive && (
        <div
          role="alertdialog"
          aria-labelledby="titulo-desativar"
          className="mt-4 rounded-xl border border-red-700 bg-white p-4"
        >
          <h2 id="titulo-desativar" className="mb-1 font-semibold">
            Desativar esta usina?
          </h2>
          <p className="mb-3 text-sm text-slate-800">
            Ela deixa de aparecer na lista de usinas ativas. Nada é apagado e você pode reativá-la
            depois.
          </p>
          <div className="flex gap-3">
            <Button
              variante="perigo"
              larga={false}
              carregando={mudar.isPending}
              textoCarregando="Desativando..."
              onClick={() => mudar.mutate(false)}
            >
              Confirmar desativação
            </Button>
            <Button variante="secundario" larga={false} onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
