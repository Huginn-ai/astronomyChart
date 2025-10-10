// 同步版：不再用 register 按需加载，避免 SSR 首帧报错
import {
  addMessages,
  init,
  getLocaleFromNavigator,
  locale,
  t,
  waitLocale
} from 'svelte-i18n';

// 直接把两份 JSON 静态导入（需要 tsconfig 有 "resolveJsonModule": true）
import en from './en.json';
import zh from './zh.json';

const browser = typeof window !== 'undefined';
const FALLBACK = 'en';

// 把词条一次性注册进来（SSR/浏览器两端都可用）
addMessages('en', en);
addMessages('zh', zh);

// 无论在哪个端，都同步设置 initialLocale —— 关键！
const initialLocale = browser
  ? (localStorage.getItem('lang') || getLocaleFromNavigator() || FALLBACK)
  : FALLBACK;

init({
  fallbackLocale: FALLBACK,
  initialLocale
});

// 浏览器端：持久化选择
if (browser) {
  locale.subscribe((v) => {
    if (v) localStorage.setItem('lang', v);
  });
}

// 暴露“就绪 Promise”（虽然现在基本是同步好了，但保留以便按钮切换 await）
export const i18nReady = (async () => {
  await waitLocale();
})();

export { t, locale, waitLocale };
