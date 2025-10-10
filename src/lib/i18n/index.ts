import { register, init, getLocaleFromNavigator, locale, t } from 'svelte-i18n';
const browser = typeof window !== 'undefined';

// 帮 TS 认识 JSON 动态导入（Vite 会把 default 导出成对象）
type Messages = Record<string, string>;
const asJsonModule = <T>() => (p: Promise<unknown>) =>
  p as unknown as Promise<{ default: T }>;

register('en', () => asJsonModule<Messages>()(import('./en.json')));
register('zh', () => asJsonModule<Messages>()(import('./zh.json')));

const FALLBACK = 'en';

function setupI18n() {
  if (browser) {
    const saved = localStorage.getItem('lang');
    init({
      fallbackLocale: FALLBACK,
      initialLocale: saved || getLocaleFromNavigator() || FALLBACK
    });

    // 持久化
    locale.subscribe((value) => {
      if (value) localStorage.setItem('lang', value);
    });
  } else {
    // SSR 端没有 window/navigator/localStorage
    init({ fallbackLocale: FALLBACK });
  }
}

setupI18n();

export { t, locale };
