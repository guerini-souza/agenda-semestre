export type InAppBrowser = { inApp: false } | { inApp: true; app: string };

// Aplicativos cujo navegador embutido o Google bloqueia no login ("disallowed_useragent"). Navegadores externos
// abertos por eles (Safari, Chrome, abas personalizadas) não entram aqui, porque o Google os aceita.
const KNOWN: [RegExp, string][] = [
  [/Instagram/i, 'Instagram'],
  [/FBAN|FBAV|FB_IAB|FBIOS/i, 'Facebook'],
  [/TikTok|musical_ly|Bytedance/i, 'TikTok'],
  [/LinkedInApp/i, 'LinkedIn'],
  [/Snapchat/i, 'Snapchat'],
  [/\bLine\//i, 'Line'],
  [/MicroMessenger/i, 'WeChat'],
  [/Twitter/i, 'Twitter'],
  [/Pinterest/i, 'Pinterest']
];

/** Diz se a página está aberta dentro do navegador embutido de um aplicativo, a partir do user agent. */
export function detectInAppBrowser(userAgent: string): InAppBrowser {
  for (const [pattern, app] of KNOWN) if (pattern.test(userAgent)) return { inApp: true, app };
  // WebView do Android: o Chrome acrescenta "; wv)" e o token "Version/x" ao user agent.
  if (/Android/i.test(userAgent) && /; wv\)/.test(userAgent)) return { inApp: true, app: 'outro aplicativo' };
  // WebView do iOS: tem WebKit mas não o token "Safari" que o Safari e os navegadores de verdade enviam.
  if (/iPhone|iPad|iPod/i.test(userAgent) && /AppleWebKit/i.test(userAgent) && !/Safari/i.test(userAgent)) return { inApp: true, app: 'outro aplicativo' };
  return { inApp: false };
}
