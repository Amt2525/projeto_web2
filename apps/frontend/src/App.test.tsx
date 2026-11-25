import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { App } from './App';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('mostra "API online" quando a API responde corretamente', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'ok',
          service: 'backend',
          timestamp: '2026-11-25T12:00:00.000Z',
        }),
      }),
    );

    render(<App />);
    expect(await screen.findByText('API online')).toBeTruthy();
  });

  it('mostra "API indisponível" quando a requisição falha', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sem rede')));

    render(<App />);
    expect(await screen.findByText('API indisponível')).toBeTruthy();
  });
});
