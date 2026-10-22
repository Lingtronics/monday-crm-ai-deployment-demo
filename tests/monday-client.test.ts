import { it, expect, vi } from 'vitest';
import { z } from 'zod';
import { Config } from '../src/config.js';
import { MondayClient, MondayTransport } from '../src/crm/monday-client.js';
import { Store } from '../src/persistence/db.js';
const config = Config.parse({ MODE: 'monday', DEMO_WRITE_ENABLED: 'true', MONDAY_API_TOKEN: 'secret-test-token', MONDAY_WORKSPACE_ID: '1', MONDAY_ALLOWED_BOARD_IDS: '2' });
it('detects HTTP 200 GraphQL errors and redacts server messages', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ errors: [{ message: 'secret-test-token PRIVATE MESSAGE', extensions: { code: 'PERMISSION_DENIED' } }] }));
  const api = new MondayTransport(config, fetcher);
  await expect(api.me()).rejects.toThrow('PERMISSION_DENIED');
  await expect(api.me()).rejects.not.toThrow('secret-test-token');
});
it('retries reads with Retry-After and pins headers/variables', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({}, { status: 429, headers: { 'Retry-After': '1' } })).mockResolvedValueOnce(Response.json({ data: { ok: true } }));
  const pause = vi.fn().mockResolvedValue(undefined); const api = new MondayTransport(config, fetcher, pause);
  await expect(api.query('query($id:ID!) { me { id } }', { id: '2' }, z.object({ ok: z.boolean() }))).resolves.toEqual({ ok: true });
  expect(pause).toHaveBeenCalledWith(1000);
  expect(fetcher.mock.calls[0]![1]!.headers).toMatchObject({ 'API-Version': '2026-07' });
  expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string).variables).toEqual({ id: '2' });
});
it('bounds network retries and never blindly retries mutations', async () => {
  const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('private detail')); const api = new MondayTransport(config, fetcher, async () => {});
  await expect(api.me()).rejects.toThrow('NETWORK_RETRIES_EXHAUSTED'); expect(fetcher).toHaveBeenCalledTimes(3);
  fetcher.mockClear(); await expect(api.query('mutation { x }', {}, z.unknown(), true)).rejects.toThrow('uncertain'); expect(fetcher).toHaveBeenCalledTimes(1);
});
it('never reads an unrelated board', async () => {
  const fetcher = vi.fn<typeof fetch>(); const api = new MondayTransport(config, fetcher);
  await expect(api.board('unrelated')).rejects.toThrow('BOARD_NOT_ALLOWLISTED'); expect(fetcher).not.toHaveBeenCalled();
});
it('rejects malformed column maps', () => {
  const store = new Store(); expect(() => new MondayClient(new MondayTransport(config), { bad: true }, store)).toThrow(); store.close();
});
