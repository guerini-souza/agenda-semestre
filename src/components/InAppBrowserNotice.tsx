import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from './ui/button';

/** Aviso para quem abriu o site no navegador embutido de um aplicativo: o Google bloqueia o login ali. */
export function InAppBrowserNotice({ app }: { app: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'manual'>('idle');
  async function copy() {
    try { await navigator.clipboard.writeText(`${location.origin}/`); setState('copied'); }
    catch { setState('manual'); }
  }
  return <div className="notice warning in-app" role="status"><div>
    <strong>Você está dentro {app === 'outro aplicativo' ? 'de outro aplicativo' : `do ${app}`}.</strong>
    <p>O Google não deixa entrar com a sua conta por aqui. Para usar o “Adicionar ao Google”, abra este endereço no <b>Safari</b> ou no <b>Chrome</b>. Se preferir, use o arquivo de calendário ao lado.</p>
    <div className="in-app-actions">
      <Button variant="secondary" onClick={() => void copy()}>{state === 'copied' ? <><Check size={16} />Link copiado</> : <><Copy size={16} />Copiar link</>}</Button>
      <code>{location.host}</code>
    </div>
    {state === 'manual' && <p>Não consegui copiar sozinho. Selecione o endereço acima e copie.</p>}
  </div></div>;
}
