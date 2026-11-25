# ADR 0005 — Front-end com React + Vite + Tailwind + shadcn/ui

**Status:** Aprovada

## Contexto

Sistema interno atrás de login, com tabelas, filtros, gráficos e mapa. Acessibilidade WCAG 2.2 AA como referência.

## Decisão

**React + Vite + TypeScript**, TanStack Query (dados do servidor), React Hook Form + Zod (formulários), Tailwind + shadcn/ui (componentes sobre Radix, acessíveis), Recharts (gráficos), Leaflet (mapa).

## Alternativas

- **Next.js:** SSR e roteamento por arquivos sem necessidade aqui.
- **MUI / Bootstrap:** identidade visual mais difícil de personalizar.
- **Google Maps:** exige chave e cobrança.

## Consequências

- shadcn/ui copia o código dos componentes para o repositório: somos responsáveis por mantê-los.
- Tiles do OpenStreetMap exigem internet e respeito à política de uso. Fallback sem mapa de fundo para a demonstração offline.
- Em dev, proxy do Vite mantém front e API na mesma origem.
