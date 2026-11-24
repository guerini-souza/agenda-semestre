import { useEffect, useState } from 'react';
import { ArrowLeft, Check, CheckCircle2, Download, ExternalLink, CalendarPlus, LoaderCircle, Smartphone } from 'lucide-react';
import type { ConfirmedEvent, ExportReport } from '../lib/domain/types';
import { downloadIcs } from '../lib/calendar/ics';
import { exportToGoogle, isGoogleConfigured, prepareGoogle } from '../lib/calendar/google';
import { detectInAppBrowser } from '../lib/browser';
import { Button } from './ui/button';
import { InAppBrowserNotice } from './InAppBrowserNotice';

export function ExportStep({ events, onBack, demo, calendarName = 'Meu semestre' }: { events: ConfirmedEvent[]; onBack: () => void; demo: boolean; calendarName?: string }) {
  const [title, setTitle] = useState(() => {
    const dates = events.map(event => event.timing.date).sort();
    return dates.length ? `${calendarName} · ${dates[0].split('-').reverse().join('/')} a ${dates.at(-1)!.split('-').reverse().join('/')}` : calendarName;
  });
  const [busy, setBusy] = useState(false);
  const [inApp] = useState(() => detectInAppBrowser(navigator.userAgent));
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [downloaded, setDownloaded] = useState(false);
  const [iphone, setIphone] = useState(false);
  const [googleHelp, setGoogleHelp] = useState(false);
  const [report, setReport] = useState<ExportReport>();
  const configured = isGoogleConfigured();
  useEffect(() => { if (configured) void prepareGoogle().catch(() => { setError('A conexão com o Google não carregou. Confira sua internet ou use o arquivo de calendário.'); }); }, [configured]);
  async function google() {
    setBusy(true); setError('');
    try {
      const batch = report?.failed.length ? events.filter(event => report.failed.some(failure => failure.id === event.id)) : events;
      const next = await exportToGoogle(batch, title.trim() || 'Meu semestre', { onProgress: setProgress, expectedCalendarId: report?.calendarId });
      setReport(previous => previous ? { ...next, created: [...new Set([...previous.created, ...next.created])], existing: [...new Set([...previous.existing, ...next.existing])] } : next);
    }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível adicionar ao Google. Você pode tentar novamente ou baixar o arquivo de calendário.'); }
    finally { setBusy(false); setProgress(''); }
  }
  function download() { try { downloadIcs(events); setDownloaded(true); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível gerar o arquivo. Volte à revisão.'); } }
  return <section className="export-section"><div className="section-heading"><h2>Agora, na sua agenda.</h2><p>{events.length} eventos prontos. Escolha onde quer acompanhar seu semestre.</p></div>{demo && <div className="notice warning"><span>Você está exportando <strong>eventos fictícios do exemplo</strong>. Eles aparecerão na agenda de destino se você continuar.</span></div>}
    <div className="export-grid"><div className="panel export-card google-card"><span className="export-icon"><CalendarPlus size={27} /></span><h3>Google Agenda</h3>
      {configured ? <><p>Adicione os eventos a um calendário separado na sua conta Google.</p>{inApp.inApp && <InAppBrowserNotice app={inApp.app} />}<label>Nome do calendário<input value={title} onChange={e => setTitle(e.target.value)} maxLength={100} disabled={busy || Boolean(report)} /></label><Button onClick={google} disabled={busy || !events.length || Boolean(report && !report.failed.length)}>{busy ? <><LoaderCircle className="spin" size={17} />Adicionando…</> : <><CalendarPlus size={17} />{report?.failed.length ? 'Tentar novamente no Google' : 'Adicionar ao Google'}</>}</Button><small>Você autoriza o acesso ao continuar. Somente os eventos selecionados são enviados.</small></> : <><p>Leve todos os eventos de uma vez usando um arquivo de calendário, pelo computador.</p><div className="notice neutral">O envio direto ainda não está habilitado. Por enquanto, importe o arquivo no Google Agenda.</div><Button onClick={() => { download(); setGoogleHelp(true); }}><Download size={17} />Usar no Google com arquivo</Button><small>Baixa o arquivo e mostra como importar. Nenhum evento é adicionado automaticamente.</small></>}
      </div>
      <div className="panel export-card"><span className="export-icon subtle"><Download size={27} /></span><h3>Arquivo de calendário</h3><p>Um arquivo .ics para importar em aplicativos compatíveis com calendários.</p><div className="ics-file"><FileIcs /><span><strong>meu-semestre.ics</strong><small>{events.length} eventos · eventos selecionados</small></span><Check size={19} /></div><Button variant="secondary" onClick={download} disabled={busy}><Download size={17} />{downloaded ? 'Baixar novamente' : 'Baixar arquivo de calendário'}</Button><small>A importação do arquivo é feita no aplicativo de destino.</small></div></div>
    {googleHelp && <div className="panel export-report"><h3>Importar no Google Agenda</h3><ol><li>No computador, <a href="https://calendar.google.com/" target="_blank" rel="noreferrer">abra o Google Agenda <ExternalLink size={13} /></a>.</li><li>Abra Configurações → Importar e exportar.</li><li>Selecione o arquivo <strong>meu-semestre.ics</strong> na pasta de downloads.</li><li>Escolha a agenda de destino e clique em Importar.</li></ol><p className="muted">Esse caminho é manual e funciona no computador. Evite importar o mesmo arquivo duas vezes.</p></div>}
    {busy && <div className="notice neutral" role="status"><LoaderCircle size={18} className="spin" /><span>{progress || 'Aguardando autorização do Google…'}</span></div>}{error && <div className="notice warning" role="alert">{error}</div>}{downloaded && <div className="notice success" role="status"><CheckCircle2 size={20} /><div><strong>Arquivo preparado para download.</strong><p>Abra os downloads do navegador e importe o .ics na sua agenda. O download sozinho não adiciona os eventos.</p></div></div>}
    {report && !report.failed.length && report.created.length + report.existing.length > 0 && <div className="notice success google-done" role="status"><CheckCircle2 size={20} /><div><strong>Pronto! Seus eventos estão no Google Agenda.</strong><p>Eles ficam na agenda “{title.trim() || calendarName}”, na conta Google que você autorizou. Abra no computador ou no celular com essa mesma conta.</p><a className="button button--secondary" href={calendarMonthUrl(events)} target="_blank" rel="noreferrer">Ver no Google Agenda <ExternalLink size={15} /></a></div></div>}
    {report && <div className="panel export-report" role="status"><h3>{report.failed.length ? 'Alguns eventos precisam de uma nova tentativa.' : 'Resultado da importação no Google'}</h3><div className="report-counts"><span><b>{report.created.length}</b> criados</span><span><b>{report.existing.length}</b> já existentes</span><span><b>{report.failed.length}</b> não adicionados</span></div>{report.failed.length > 0 && <details><summary>Ver eventos que não foram adicionados</summary><ul>{report.failed.map(item => <li key={item.id}>{events.find(e => e.id === item.id)?.title || 'Evento'}: {item.message}</li>)}</ul></details>}<p className="muted">A nova tentativa envia apenas os eventos que falharam. O nome identifica o calendário neste navegador. Se você limpar os dados do navegador ou usar outro aparelho, confira a agenda anterior manualmente para evitar duplicatas.</p></div>}
    <div className="iphone-section"><button type="button" className="iphone-toggle" aria-expanded={iphone} onClick={() => setIphone(!iphone)}><Smartphone size={24} /><span><strong>Vai usar no iPhone?</strong><small>Veja como levar os eventos para o Calendário.</small></span><span className="text-link">{iphone ? 'Fechar' : 'Ver instruções'}</span></button>{iphone && <div className="iphone-guide"><div><h3>Com uma conta Google</h3><ol><li>Use “Adicionar ao Google” acima.</li><li>No iPhone, abra Ajustes → Apps → Calendário → Contas do Calendário e adicione sua conta Google, se necessário.</li><li>Ative Calendários para essa conta. No app Calendário, toque em Calendários e marque o calendário do semestre.</li></ol></div><div><h3>Com o arquivo .ics</h3><ol><li>Baixe o arquivo de calendário.</li><li>Envie ou compartilhe o arquivo para um e-mail seu, usando o próprio aparelho.</li><li>Abra o anexo .ics no app Mail do iPhone e siga as opções de adição ao Calendário.</li></ol><p className="muted">Baixar pelo Safari não garante que o Calendário abrirá. Este site não envia e-mails nem cria uma assinatura de calendário.</p></div><a href="https://support.apple.com/pt-br/guide/iphone/ipha0d932e96/ios" target="_blank" rel="noreferrer">Instruções da Apple <ExternalLink size={13} /></a></div>}</div>
    <Button variant="ghost" onClick={onBack} disabled={busy}><ArrowLeft size={16} />Voltar para conferir</Button><p className="local-state-note">Os dados ficam apenas nesta página. Ao fechar ou recarregar, será necessário ler os arquivos novamente.</p>
  </section>;
}
/** Abre o Google Agenda no mês do primeiro evento enviado. */
function calendarMonthUrl(events: ConfirmedEvent[]): string {
  const first = events.map(event => event.timing.date).sort()[0];
  return first ? `https://calendar.google.com/calendar/r/month/${Number(first.slice(0, 4))}/${Number(first.slice(5, 7))}/1` : 'https://calendar.google.com/calendar/r';
}
function FileIcs() { return <span className="ics-icon">ICS</span>; }
