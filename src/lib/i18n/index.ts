import { addMessages, init, locale, t, waitLocale } from 'svelte-i18n';
import en from './en.json';
import zh from './zh.json';
import { readPreference, savePreference } from '../utils/storage';

addMessages('en', en);
addMessages('zh', zh);
// Match the server's first render. Restore the user's choice after mounting.
init({ fallbackLocale: 'en', initialLocale: 'en' });

export function setLanguage(language: 'en' | 'zh') {
	locale.set(language);
	savePreference('lang', language);
}

export function restoreLanguage() {
	const saved = readPreference('lang');
	const preferred = saved || (typeof navigator !== 'undefined' ? navigator.language : 'en');
	setLanguage(preferred.toLowerCase().startsWith('zh') ? 'zh' : 'en');
}

export { t, locale, waitLocale };
