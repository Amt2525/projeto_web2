import type { ComponentProps } from 'react';

export type VarianteDoBotao = 'primario' | 'secundario' | 'perigo';

const VARIANTES: Record<VarianteDoBotao, string> = {
  primario: 'bg-blue-700 text-white hover:bg-blue-800 disabled:bg-slate-600',
  secundario:
    'border border-slate-500 bg-white text-slate-900 hover:bg-slate-100 disabled:text-slate-600',
  perigo: 'bg-red-700 text-white hover:bg-red-800 disabled:bg-slate-600',
};

// Classes do botão, exportadas para que um <Link> também possa ter a aparência de botão.
export function classesDoBotao(variante: VarianteDoBotao = 'primario', larga = true): string {
  return [
    'inline-flex items-center justify-center rounded-md px-4 py-2.5 text-base font-semibold',
    'disabled:cursor-not-allowed',
    larga ? 'w-full' : '',
    VARIANTES[variante],
  ].join(' ');
}

type Props = ComponentProps<'button'> & {
  variante?: VarianteDoBotao;
  // Por padrão o botão ocupa toda a largura (como no login). Use larga={false} em barras de ações.
  larga?: boolean;
  // Enquanto verdadeiro, o botão fica desabilitado (evita envio duplo) e mostra este texto.
  carregando?: boolean;
  textoCarregando?: string;
};

export function Button({
  variante = 'primario',
  larga = true,
  carregando = false,
  textoCarregando = 'Aguarde...',
  children,
  className,
  disabled,
  ...resto
}: Props) {
  return (
    <button
      {...resto}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={[classesDoBotao(variante, larga), className ?? ''].join(' ')}
    >
      {carregando ? textoCarregando : children}
    </button>
  );
}
