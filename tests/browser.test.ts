import { describe, it, expect } from 'vitest';
import { detectInAppBrowser } from '../src/lib/browser';

const ua = {
  instagramIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21A329 Instagram 312.0.0.34.111 (iPhone14,5; iOS 17_0; pt_BR; pt-BR; scale=3.00; 1170x2532; 551934723)',
  instagramAndroid: 'Mozilla/5.0 (Linux; Android 13; SM-S908B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.43 Mobile Safari/537.36 Instagram 312.1.0.34.111 Android (33/13; 480dpi; 1080x2340; samsung; SM-S908B; b0q; qcom; pt_BR; 551934723)',
  facebookIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21A329 [FBAN/FBIOS;FBAV/430.0.0.30.115;FBBV/543210;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.0;FBSS/3;FBID/phone;FBLC/pt_BR;FBOP/5]',
  facebookAndroid: 'Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/440.0.0.33.113;]',
  tiktok: 'Mozilla/5.0 (Linux; Android 12; M2101K6G Build/SKQ1.211006.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0.0.0 Mobile Safari/537.36 musical_ly_2023305040 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/musical_ly app_version/30.5.4',
  androidWebView: 'Mozilla/5.0 (Linux; Android 13; SM-A546E Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.43 Mobile Safari/537.36',
  iosWebView: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  safariIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  chromeIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.50 Mobile/15E148 Safari/604.1',
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  samsungInternet: 'Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
  chromeDesktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  firefoxDesktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
};

describe('navegador embutido de aplicativos (o Google bloqueia o login ali)', () => {
  it('reconhece o nome do aplicativo quando ele se identifica', () => {
    expect(detectInAppBrowser(ua.instagramIos)).toEqual({ inApp: true, app: 'Instagram' });
    expect(detectInAppBrowser(ua.instagramAndroid)).toEqual({ inApp: true, app: 'Instagram' });
    expect(detectInAppBrowser(ua.facebookIos)).toEqual({ inApp: true, app: 'Facebook' });
    expect(detectInAppBrowser(ua.facebookAndroid)).toEqual({ inApp: true, app: 'Facebook' });
    expect(detectInAppBrowser(ua.tiktok)).toEqual({ inApp: true, app: 'TikTok' });
    expect(detectInAppBrowser('Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1 LinkedInApp')).toEqual({ inApp: true, app: 'LinkedIn' });
  });

  it('detecta navegador embutido sem nome (WebView do Android e do iOS) com nome genérico', () => {
    expect(detectInAppBrowser(ua.androidWebView)).toEqual({ inApp: true, app: 'outro aplicativo' });
    expect(detectInAppBrowser(ua.iosWebView)).toEqual({ inApp: true, app: 'outro aplicativo' });
  });

  it('não confunde navegadores de verdade com navegador embutido', () => {
    for (const real of [ua.safariIos, ua.chromeIos, ua.chromeAndroid, ua.samsungInternet, ua.chromeDesktop, ua.firefoxDesktop, '']) {
      expect(detectInAppBrowser(real)).toEqual({ inApp: false });
    }
  });
});
