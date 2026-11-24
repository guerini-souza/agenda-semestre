import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportToGoogle, googleEventBody, googleEventId, sendGoogleBatch } from '../src/lib/calendar/google';
import * as auth from '../src/lib/auth/google';
import type { ConfirmedEvent } from '../src/lib/domain/types';
const event: ConfirmedEvent = { id: 'e1', course: 'Física', title: 'Prova', kind: 'exam', timeZone: 'America/Sao_Paulo', sources: [], timing: { mode: 'allDay', date: '2026-12-31' } };
const lesson: ConfirmedEvent = { id: 'c1', course: 'Física', title: 'Aula', kind: 'class', timeZone: 'America/Sao_Paulo', sources: [], timing: { mode: 'timed', date: '2026-08-04', startTime: '19:00', endTime: '21:00' } };
const noWait = { sleep: async () => undefined };
const apiError = (status: number, reason: string, headers?: HeadersInit) => new Response(JSON.stringify({ error: { code: status, errors: [{ reason }] } }), { status, headers });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe('Google com transporte simulado', () => {
  it('usa IDs válidos e estáveis independentes de arquivo ou candidato', async () => {
    const id = await googleEventId(event);
    expect(id).toMatch(/^[0-9a-v]{5,1024}$/);
    expect(await googleEventId({ ...event, id: 'outro', sources: [{ fileId: 'f', fileName: 'f', excerpt: 'outro', method: 'manual' }] })).toBe(id);
    expect(googleEventBody(event, id).end).toEqual({ date: '2027-01-01' });
  });
  it('colore as avaliações e define lembretes por tipo de evento', async () => {
    const exam = googleEventBody(event, await googleEventId(event));
    expect(exam.colorId).toBe('11');
    expect(exam.reminders).toEqual({ useDefault: false, overrides: [{ method: 'popup', minutes: 900 }] }); // dia inteiro: 9h da véspera
    const timedExam = googleEventBody({ ...event, timing: { mode: 'timed', date: '2026-12-31', startTime: '19:00', endTime: '21:00' } }, 'x'.repeat(8));
    expect(timedExam.reminders.overrides.map(r => r.minutes)).toEqual([60, 1440]);
    const klass = googleEventBody(lesson, 'y'.repeat(8));
    expect(klass).not.toHaveProperty('colorId');
    expect(klass.reminders.overrides.map(r => r.minutes)).toEqual([30]);
  });
  it('trata duplicata apenas após conferir propriedade do app', async () => {
    const id = await googleEventId(event);
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 409 })).mockResolvedValueOnce(new Response(JSON.stringify({ extendedProperties: { private: { semestreId: id } } })));
    vi.stubGlobal('fetch', fetcher);
    expect((await sendGoogleBatch([event], 'calendar', 'test-only')).existing).toEqual(['e1']);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('tenta de novo com espera crescente quando o Google limita a taxa, e depois conclui', async () => {
    const waits: number[] = [];
    const fetcher = vi.fn().mockResolvedValueOnce(apiError(403, 'rateLimitExceeded')).mockResolvedValueOnce(apiError(429, 'x')).mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetcher);
    const progress: string[] = [];
    const report = await sendGoogleBatch([event], 'calendar', 'test-only', { sleep: async ms => { waits.push(ms); }, onProgress: m => progress.push(m) });
    expect(report.created).toEqual(['e1']); expect(report.failed).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(waits[0]).toBeGreaterThanOrEqual(1000); expect(waits[0]).toBeLessThan(1300);
    expect(waits[1]).toBeGreaterThanOrEqual(2000); expect(waits[1]).toBeLessThan(2300);
    expect(progress.some(m => m.includes('pediu uma pausa'))).toBe(true);
  });
  it('respeita o Retry-After enviado pelo Google', async () => {
    const waits: number[] = [];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(apiError(429, 'x', { 'Retry-After': '4' })).mockResolvedValue(new Response('{}')));
    await sendGoogleBatch([event], 'calendar', 'test-only', { sleep: async ms => { waits.push(ms); } });
    expect(waits[0]).toBeGreaterThanOrEqual(4000);
  });
  it('preserva sucesso em falha parcial e pausa o lote quando o limite persiste', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('{}')).mockResolvedValue(apiError(429, 'x'));
    vi.stubGlobal('fetch', fetcher);
    const report = await sendGoogleBatch([event, { ...event, id: 'e2' }, { ...event, id: 'e3' }], 'calendar', 'test-only', noWait);
    expect(report.created).toEqual(['e1']); expect(report.failed.map(item => item.id)).toEqual(['e2', 'e3']);
    expect(report.failed[0].message).toContain('limitou os envios');
    expect(fetcher).toHaveBeenCalledTimes(1 + 5); // e1 e as 5 tentativas de e2; e3 nem é enviado
  });
  it('falta de permissão não é repetida e pausa o lote com mensagem clara', async () => {
    const fetcher = vi.fn().mockResolvedValue(apiError(403, 'forbidden')); vi.stubGlobal('fetch', fetcher);
    const report = await sendGoogleBatch([event, { ...event, id: 'e2' }], 'calendar', 'test-only', noWait);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(report.failed).toHaveLength(2); expect(report.failed[0].message).toContain('permissão');
  });
  it('API não ativada no projeto gera aviso para o responsável', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(apiError(403, 'accessNotConfigured')));
    const report = await sendGoogleBatch([event], 'calendar', 'test-only', noWait);
    expect(report.failed[0].message).toContain('não está ativada');
  });
  it('erro do servidor do Google é repetido e, se persistir, pausa o lote', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 503 })); vi.stubGlobal('fetch', fetcher);
    const report = await sendGoogleBatch([event, { ...event, id: 'e2' }], 'calendar', 'test-only', noWait);
    expect(fetcher).toHaveBeenCalledTimes(5); expect(report.failed.map(i => i.id)).toEqual(['e1', 'e2']);
  });
  it('queda de conexão é repetida e pausa o lote com mensagem clara', async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError('Failed to fetch')); vi.stubGlobal('fetch', fetcher);
    const report = await sendGoogleBatch([event, { ...event, id: 'e2' }], 'calendar', 'test-only', noWait);
    expect(fetcher).toHaveBeenCalledTimes(5);
    expect(report.failed).toHaveLength(2); expect(report.failed[0].message).toContain('conexão');
  });
  it('dado recusado pelo Google falha só aquele evento e o lote continua', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(apiError(400, 'invalid')).mockResolvedValue(new Response('{}')); vi.stubGlobal('fetch', fetcher);
    const report = await sendGoogleBatch([event, { ...event, id: 'e2' }], 'calendar', 'test-only', noWait);
    expect(report.failed.map(i => i.id)).toEqual(['e1']); expect(report.created).toEqual(['e2']);
  });
  it('token expirado pausa todos os itens restantes', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 401 })); vi.stubGlobal('fetch', fetcher);
    const report = await sendGoogleBatch([event, { ...event, id: 'e2' }], 'calendar', 'test-only');
    expect(report.failed).toHaveLength(2); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('troca de conta durante retomada não cria agenda nem envia eventos', async () => {
    vi.spyOn(auth, 'authorizeGoogle').mockResolvedValue('test-only');
    vi.stubGlobal('localStorage', { getItem: vi.fn().mockReturnValue(null), setItem: vi.fn(), removeItem: vi.fn() });
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ sub: 'different-account' })));
    vi.stubGlobal('fetch', fetcher);
    await expect(exportToGoogle([event], 'Meu semestre', { expectedCalendarId: 'previous-calendar' })).rejects.toThrow('mesma conta');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toContain('userinfo');
  });
  it('se a agenda guardada foi apagada no Google, cria outra e envia os eventos', async () => {
    vi.spyOn(auth, 'authorizeGoogle').mockResolvedValue('test-only');
    const storage = { getItem: vi.fn().mockReturnValue(JSON.stringify({ calendarId: 'apagada', report: { created: ['e1'], existing: [], failed: [] } })), setItem: vi.fn(), removeItem: vi.fn() };
    vi.stubGlobal('localStorage', storage);
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ sub: 'conta' })))        // userinfo
      .mockResolvedValueOnce(apiError(404, 'notFound'))                              // agenda guardada não existe mais
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'nova' })))           // cria agenda nova
      .mockResolvedValue(new Response('{}'));                                        // eventos
    vi.stubGlobal('fetch', fetcher);
    const report = await exportToGoogle([event], 'Meu semestre', noWait);
    expect(report.calendarId).toBe('nova'); expect(report.created).toEqual(['e1']);
    expect(storage.removeItem).toHaveBeenCalledWith('semestre:v1:conta:Meu semestre');
    expect(String(fetcher.mock.calls[2][0])).toMatch(/\/calendars$/);
    expect(String(fetcher.mock.calls[3][0])).toContain('/calendars/nova/events');
    expect(JSON.parse(storage.setItem.mock.calls.at(-1)![1])).toMatchObject({ calendarId: 'nova' });
  });
});
