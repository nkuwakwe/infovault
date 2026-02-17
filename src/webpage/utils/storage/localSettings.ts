import { getLocalSettings as getLocalSettingsFromSupabase, setLocalSettings as setLocalSettingsInSupabase } from '../../supabaseData.js';

export const enum ServiceWorkerMode {
	// Skips registering of service worker completely
	Unregistered = "unregistered",
	// Registers service worker but does not activate it
	Disabled = "disabled",
	// Ensures client files are cached and used when offline
	OfflineOnly = "offlineOnly",
	// Cache everything and use cached files when possible
	Enabled = "enabled",
}

export const ServiceWorkerModeValues = [
	ServiceWorkerMode.Unregistered,
	ServiceWorkerMode.Disabled,
	ServiceWorkerMode.OfflineOnly,
	ServiceWorkerMode.Enabled,
];

export class LocalSettings {
	serviceWorkerMode: ServiceWorkerMode = ServiceWorkerMode.Unregistered;
	constructor(init?: Partial<LocalSettings>) {
		Object.assign(this, init);
	}
}

// Get current user ID (this should be available from auth context)
function getCurrentUserId(): string {
	// TODO: Get from actual auth context when available
	// For now, use a fallback or get from localStorage
	return localStorage.getItem('currentUserId') || 'anonymous-user';
}

export async function getLocalSettings(): Promise<LocalSettings> {
	try {
		const userId = getCurrentUserId();
		
		// Try to get from Supabase first
		const supabaseSettings = await getLocalSettingsFromSupabase(userId);
		if (supabaseSettings) {
			console.log('Loaded local settings from Supabase');
			return new LocalSettings(supabaseSettings);
		}
		
		// Fallback to localStorage
		console.log('Loading local settings from localStorage (fallback)');
		const localSettings = new LocalSettings(JSON.parse(localStorage.getItem("localSettings") || "{}"));
		
		// Save to Supabase for future use
		await saveLocalSettingsToSupabase(localSettings);
		
		return localSettings;
	} catch (error) {
		console.error('Failed to get local settings from Supabase, using localStorage:', error);
		// Fallback to localStorage
		return new LocalSettings(JSON.parse(localStorage.getItem("localSettings") || "{}"));
	}
}

export async function setLocalSettings(settings: LocalSettings): Promise<void> {
	try {
		// Save to localStorage for offline access
		localStorage.setItem("localSettings", JSON.stringify(settings));
		
		// Save to Supabase
		await saveLocalSettingsToSupabase(settings);
		
		console.log('Local settings saved to both localStorage and Supabase');
	} catch (error) {
		console.error('Failed to save local settings to Supabase, saving to localStorage only:', error);
		// Fallback to localStorage only
		localStorage.setItem("localSettings", JSON.stringify(settings));
	}
}

async function saveLocalSettingsToSupabase(settings: LocalSettings): Promise<void> {
	try {
		const userId = getCurrentUserId();
		
		// Convert to Supabase format
		const settingsData = {
			service_worker_mode: settings.serviceWorkerMode,
			settings: {} // Additional settings can be added here
		};
		
		const result = await setLocalSettingsInSupabase(userId, settingsData);
		
		if (result) {
			console.log('Local settings saved to Supabase successfully');
		} else {
			throw new Error('Failed to save local settings to Supabase');
		}
	} catch (error) {
		console.error('Error saving local settings to Supabase:', error);
		throw error;
	}
}

//region Migration from untyped storage
function migrateOldSettings() {
	const settings = getLocalSettings();
	let mod = false;

	const oldSWMode = localStorage.getItem("SWMode");
	if (oldSWMode !== null) {
		settings.serviceWorkerMode = oldSWMode as ServiceWorkerMode;
		localStorage.removeItem("SWMode");
		mod = true;
	}

	if (mod) {
		localStorage.setItem("localSettings", JSON.stringify(settings));
	}
}

migrateOldSettings();
//endregion
