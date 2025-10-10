// src/lib/i18n/index.ts
import {
  register,
  init,
  getLocaleFromNavigator,
  locale,
  t,
  waitLocale
} from 'svelte-i18n';

const browser = typeof window !== 'undefined';

// 让 TS 认识 JSON 动态导入（Vite 将 default 导出成对象）
type Messages = Record<string, string>;
const asJsonModule = <T>() => (p: Promise<unknown>) =>
  p as unknown as Promise<{ default: T }>;

// 注册语言包（按需异步加载）
register('en', () => asJsonModule<Messages>()(import('./en.json')));
register('zh', () => asJsonModule<Messages>()(import('./zh.json')));

const FALLBACK = 'en';

// —— 关键修复：无论 SSR 还是浏览器都设置 initialLocale —— //
const initialLocale = browser
  ? (localStorage.getItem('lang') || getLocaleFromNavigator() || FALLBACK)
  : FALLBACK;

init({
  fallbackLocale: FALLBACK,
  initialLocale
});

// 浏览器端：持久化语言选择
if (browser) {
  locale.subscribe((value: string | undefined) => {
    if (value) localStorage.setItem('lang', value);
  });
}

// 导出一个“就绪 Promise”，外层可等待词条加载完成再渲染
export const i18nReady = (async () => {
  await waitLocale();
})();

export { t, locale, waitLocale };
