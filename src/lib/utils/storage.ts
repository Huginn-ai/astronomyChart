// Storage can be unavailable in private browsing or embedded browsers.
export function readPreference(key: string): string | null {
	try {
		return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
	} catch {
		return null;
	}
}

export function savePreference(key: string, value: string): void {
	try {
		if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
	} catch {
		/* Settings still work for the current session. */
	}
}
