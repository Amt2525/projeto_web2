import type { ComponentProps } from 'react';

type Props = ComponentProps<'button'> & {
  // Enquanto verdadeiro, o botão fica desabilitado (evita envio duplo) e mostra este texto.
  carregando?: boolean;
  textoCarregando?: string;
};

export function Button({
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
      className={[
        'inline-flex w-full items-center justify-center rounded-md bg-blue-700 px-4 py-2.5',
        'text-base font-semibold text-white hover:bg-blue-800',
        'disabled:cursor-not-allowed disabled:bg-slate-600',
        className ?? '',
      ].join(' ')}
    >
      {carregando ? textoCarregando : children}
    </button>
  );
}
