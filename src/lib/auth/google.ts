export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.app.created';
export const MISSING_CALENDAR_PERMISSION = 'Faltou a permissão da agenda. Clique em Adicionar ao Google de novo e, na tela do Google, deixe marcada a opção de criar e alterar eventos nas agendas do Semestre antes de continuar.';
type TokenResponse = { access_token?: string; scope?: string; error?: string };
type GoogleIdentity = { accounts: { oauth2: { initTokenClient: (options: { client_id: string; scope: string; include_granted_scopes: boolean; callback: (response: TokenResponse) => void; error_callback: () => void }) => { requestAccessToken: (options: { prompt: string }) => void } } } };
declare global { interface Window { google?: GoogleIdentity } }
let loading: Promise<void> | undefined;
export const isGoogleConfigured = (): boolean => Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim());
export function prepareGoogle(): Promise<void> {
  if (!isGoogleConfigured()) return Promise.reject(new Error('Google ainda não configurado. Use o arquivo de calendário.'));
  if (window.google?.accounts.oauth2) return Promise.resolve();
  if (!loading) loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.async = true;
    script.onload = () => resolve(); script.onerror = () => { loading = undefined; script.remove(); reject(new Error('Não foi possível carregar a autorização Google. Verifique a conexão e tente novamente.')); };
    document.head.append(script);
  });
  return loading;
}
/** Must be called synchronously from a user gesture after prepareGoogle. Never persists a token. */
export function authorizeGoogle(): Promise<string> {
  if (!isGoogleConfigured() || !window.google?.accounts.oauth2) {
    void prepareGoogle().catch(() => undefined);
    return Promise.reject(new Error('A autorização está carregando. Clique em Adicionar ao Google novamente.'));
  }
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({ client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID, scope: `openid ${CALENDAR_SCOPE}`, include_granted_scopes: false,
      callback: response => {
        if (response.error || !response.access_token) { reject(new Error('Autorização não concedida. Você pode tentar novamente ou baixar o calendário.')); return; }
        // A tela do Google deixa desmarcar cada permissão: a pessoa pode continuar sem a da agenda.
        if (!response.scope?.split(' ').includes(CALENDAR_SCOPE)) { reject(new Error(MISSING_CALENDAR_PERMISSION)); return; }
        resolve(response.access_token);
      }, error_callback: () => reject(new Error('A janela de autorização foi fechada ou bloqueada. Tente novamente.')) });
    client.requestAccessToken({ prompt: 'select_account' });
  });
}
