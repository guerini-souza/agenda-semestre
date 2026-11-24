import { authorizeGoogle } from '../auth/google';
import { calendarDescription, calendarTitle, confirmedKey, nextDate } from '../domain/calendar';
import { ConfirmedEventSchema, LIMITS } from '../domain/types';
import type { ConfirmedEvent, EventKind, ExportReport } from '../domain/types';
export { isGoogleConfigured, prepareGoogle } from '../auth/google';
const BASE = 'https://www.googleapis.com/calendar/v3';
type Options = { onProgress?: (message: string) => void; expectedCalendarId?: string; /** Espera entre tentativas; injetável nos testes. */ sleep?: (ms: number) => Promise<void> };
class ApiError extends Error { constructor(public status: number, message: string, public reason?: string) { super(message); } }

/** Cores do Google Agenda por tipo de evento (aulas ficam na cor da própria agenda). */
const COLOR_ID: Partial<Record<EventKind, string>> = { exam: '11', assignment: '5', presentation: '3', other: '8' };
const MAX_ATTEMPTS = 5;
const defaultSleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export async function googleEventId(event: ConfirmedEvent): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(confirmedKey(event)));
  return `s${Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')}`;
}
/** Lembretes: aulas 30 min antes; avaliações 1 hora e 1 dia antes; avaliações de dia inteiro às 9h da véspera. */
function reminders(event: ConfirmedEvent) {
  const minutes = event.kind === 'class' ? [30] : event.timing.mode === 'allDay' ? [900] : [60, 1440];
  return { useDefault: false, overrides: minutes.map(value => ({ method: 'popup', minutes: value })) };
}
export function googleEventBody(event: ConfirmedEvent, id: string) {
  const timing = event.timing;
  const colorId = COLOR_ID[event.kind];
  return { id, summary: calendarTitle(event), description: calendarDescription(event), location: event.location, ...(colorId ? { colorId } : {}),
    start: timing.mode === 'allDay' ? { date: timing.date } : { dateTime: `${timing.date}T${timing.startTime}:00`, timeZone: event.timeZone },
    end: timing.mode === 'allDay' ? { date: nextDate(timing.date) } : { dateTime: `${timing.date}T${timing.endTime}:00`, timeZone: event.timeZone },
    reminders: reminders(event),
    extendedProperties: { private: { semestreId: id } }
  };
}
export async function sendGoogleBatch(events: ConfirmedEvent[], calendarId: string, token: string, options: Options = {}): Promise<ExportReport> {
  const report: ExportReport = { created: [], existing: [], failed: [], calendarId };
  let halted: string | undefined;
  for (const [index, event] of events.entries()) {
    if (halted) { report.failed.push({ id: event.id, message: halted }); continue; }
    options.onProgress?.(`Enviando evento ${index + 1} de ${events.length}`);
    try {
      const id = await googleEventId(event);
      try {
        await request(`/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=none`, token, { method: 'POST', body: JSON.stringify(googleEventBody(event, id)) }, options);
        report.created.push(event.id);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 409) throw error;
        const existing = await request(`/calendars/${encodeURIComponent(calendarId)}/events/${id}`, token, {}, options) as { status?: string; extendedProperties?: { private?: { semestreId?: string } } };
        if (existing.status === 'cancelled' || existing.extendedProperties?.private?.semestreId !== id) throw new Error('Evento existente divergente ou removido. Confira a agenda antes de tentar novamente.');
        report.existing.push(event.id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha de conexão. Tente novamente.';
      report.failed.push({ id: event.id, message });
      // Autorização, permissão, limite, rede ou Google fora do ar: continuar evento a evento só repetiria a falha.
      if (error instanceof ApiError && (error.status === 0 || error.status >= 500 || [401, 403, 429].includes(error.status))) halted = message;
    }
  }
  return report;
}

function failureMessage(status: number, reason?: string): string {
  if (status === 401) return 'A autorização expirou. Autorize novamente para retomar.';
  if (status === 403 && reason === 'accessNotConfigured') return 'A Google Calendar API não está ativada no projeto do aplicativo. Avise o responsável e use o arquivo .ics enquanto isso.';
  if (status === 403 && ['rateLimitExceeded', 'userRateLimitExceeded', 'quotaExceeded', 'dailyLimitExceeded'].includes(reason ?? '')) return 'O Google limitou os envios por agora. O lote foi pausado: tente de novo em alguns minutos ou use o arquivo .ics.';
  if (status === 403) return 'O Google não permitiu criar eventos nesta agenda. Autorize de novo e marque a permissão de agendas.';
  if (status === 429) return 'O Google limitou os envios por agora. O lote foi pausado: tente de novo em alguns minutos ou use o arquivo .ics.';
  if (status === 404) return 'O Google não encontrou a agenda ou o evento. Tente novamente.';
  if (status === 400) return 'O Google recusou os dados deste evento. Confira data, horário e título.';
  return `Google retornou erro ${status}. Tente novamente.`;
}
/** Chamada à API com nova tentativa e espera crescente quando o Google pede calma (429, 5xx e limites de taxa). */
async function request(path: string, token: string, init: RequestInit = {}, options: Options = {}): Promise<unknown> {
  const sleep = options.sleep ?? defaultSleep;
  for (let attempt = 1; ; attempt++) {
    let response: Response | undefined;
    try { response = await fetch(`${BASE}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }); }
    catch { /* falha de rede: tratada abaixo como tentativa repetível */ }
    if (response?.ok) return response.status === 204 ? {} : response.json();
    const body = response ? await response.json().catch(() => undefined) as { error?: { errors?: { reason?: string }[]; status?: string } } | undefined : undefined;
    const status = response?.status ?? 0;
    const reason = body?.error?.errors?.[0]?.reason ?? body?.error?.status;
    const rateLimited = status === 429 || (status === 403 && ['rateLimitExceeded', 'userRateLimitExceeded'].includes(reason ?? ''));
    const retryable = !response || rateLimited || status >= 500;
    if (!retryable || attempt >= MAX_ATTEMPTS) throw new ApiError(status, response ? failureMessage(status, reason) : 'Falha de conexão com o Google. Confira a internet e tente novamente.', reason);
    const asked = Number(response?.headers.get('Retry-After'));
    const wait = Math.min(30000, Number.isFinite(asked) && asked > 0 ? asked * 1000 : 1000 * 2 ** (attempt - 1)) + Math.floor(Math.random() * 250);
    options.onProgress?.(`O Google pediu uma pausa. Nova tentativa em ${Math.ceil(wait / 1000)} s…`);
    await sleep(wait);
  }
}

export async function exportToGoogle(input: ConfirmedEvent[], title: string, options: Options = {}): Promise<ExportReport> {
  const events = input.map(event => ConfirmedEventSchema.parse(event));
  if (!events.length || events.length > LIMITS.events) throw new Error('Selecione de 1 a 1.500 eventos.');
  // The call preceding the first await preserves the user's popup activation.
  const token = await authorizeGoogle();
  options.onProgress?.('Conferindo a conta e a agenda');
  const identityResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${token}` } });
  if (!identityResponse.ok) throw new Error('Não foi possível identificar a conta autorizada. Nenhum evento foi enviado.');
  const identity = await identityResponse.json() as { sub?: string };
  if (!identity.sub) throw new Error('A conta não retornou um identificador. Tente novamente.');
  const key = `semestre:v1:${identity.sub}:${title.trim()}`;
  let cached: { calendarId?: string; report?: ExportReport } = {};
  try { const value = localStorage.getItem(key); if (value) cached = JSON.parse(value); localStorage.setItem('semestre:storage-check', '1'); localStorage.removeItem('semestre:storage-check'); }
  catch { throw new Error('O armazenamento local está indisponível. Use ICS para evitar criar agendas repetidas.'); }
  let calendarId = cached.calendarId;
  if (options.expectedCalendarId && calendarId !== options.expectedCalendarId) throw new Error('Use a mesma conta e o mesmo calendário para retomar este lote. Nenhum evento foi enviado nesta tentativa.');
  if (calendarId) {
    try { await request(`/calendars/${encodeURIComponent(calendarId)}/events?maxResults=1`, token, {}, options); }
    catch (error) {
      // A agenda guardada pode ter sido apagada no Google: cria outra em vez de travar.
      if (!(error instanceof ApiError) || ![404, 410].includes(error.status)) throw error;
      calendarId = undefined; cached = {};
      try { localStorage.removeItem(key); } catch { /* sem armazenamento: a agenda nova é criada de qualquer forma */ }
    }
  }
  if (!calendarId) {
    const calendar = await request('/calendars', token, { method: 'POST', body: JSON.stringify({ summary: title.trim() || 'Meu semestre', timeZone: events[0].timeZone, description: 'Criada pelo Semestre. Atualizações exigem nova importação e confirmação.' }) }, options) as { id?: string };
    if (!calendar.id) throw new Error('O Google não retornou a identificação da agenda.');
    calendarId = calendar.id;
    try { localStorage.setItem(key, JSON.stringify({ calendarId })); }
    catch { throw new Error(`Agenda criada (${calendarId}), mas não foi possível guardar sua identificação. Não tente criar outra; use ICS.`); }
  }
  const successes = new Set([...(cached.report?.created || []), ...(cached.report?.existing || [])]);
  // Stable Google IDs resolve uncertain responses; only this same in-memory batch's failures are retried by the UI.
  const report = await sendGoogleBatch(events, calendarId, token, options);
  report.created.forEach(id => successes.add(id)); report.existing.forEach(id => successes.add(id));
  try { localStorage.setItem(key, JSON.stringify({ calendarId, report: { ...report, created: [...successes] } })); } catch { /* Calendar ID was persisted before any events. The displayed report remains available. */ }
  return report;
}
