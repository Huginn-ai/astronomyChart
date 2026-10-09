import { onDestroy } from 'svelte';
import { t, locale } from './index';
import type { Language } from '../utils/observing';

// Component-scoped subscriptions keep Svelte 5 templates reactive without
// naming local variables $t/$locale, and are disposed with the component.
export function createI18n() {
	let language = $state<Language>('en');
	let translate = $state<(key: string) => string>((key) => key);
	const unsubscribeT = t.subscribe((fn) => {
		translate = (key) => String(fn(key));
	});
	const unsubscribeLocale = locale.subscribe((value) => {
		language = value?.startsWith('zh') ? 'zh' : 'en';
	});
	onDestroy(() => {
		unsubscribeT();
		unsubscribeLocale();
	});
	return {
		get lang() {
			return language;
		},
		get tr() {
			return translate;
		}
	};
}
