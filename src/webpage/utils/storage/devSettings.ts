import { getDeveloperSettings as getDevSettingsFromSupabase, setDeveloperSettings as setDevSettingsInSupabase } from '../../supabaseData.js';

export class DeveloperSettings {
	gatewayLogging: boolean = false;
	gatewayCompression: boolean = true;
	showTraces: boolean = false;
	interceptApiTraces: boolean = false;
	cacheSourceMaps: boolean = false;
	logBannedFields: boolean = false;
	reportSystem = false;

	constructor(data: Partial<DeveloperSettings> = {}) {
		Object.assign(this, data);
	}
}

// Get current user ID (this should be available from auth context)
function getCurrentUserId(): string {
	// TODO: Get from actual auth context when available
	// For now, use a fallback or get from localStorage
	return localStorage.getItem('currentUserId') || 'anonymous-user';
}

export async function getDeveloperSettings(): Promise<DeveloperSettings> {
	try {
		const userId = getCurrentUserId();
		
		// Try to get from Supabase first
		const supabaseSettings = await getDevSettingsFromSupabase(userId);
		if (supabaseSettings) {
			console.log('Loaded developer settings from Supabase');
			return new DeveloperSettings(supabaseSettings.settings);
		}
		
		// Fallback to localStorage
		console.log('Loading developer settings from localStorage (fallback)');
		const localSettings = new DeveloperSettings(JSON.parse(localStorage.getItem("developerSettings") || "{}"));
		
		// Save to Supabase for future use
		await saveDeveloperSettingsToSupabase(localSettings);
		
		return localSettings;
	} catch (error) {
		console.error('Failed to get developer settings from Supabase, using localStorage:', error);
		// Fallback to localStorage
		return new DeveloperSettings(JSON.parse(localStorage.getItem("developerSettings") || "{}"));
	}
}

export async function setDeveloperSettings(settings: DeveloperSettings): Promise<void> {
	try {
		// Save to localStorage for offline access
		localStorage.setItem("developerSettings", JSON.stringify(settings));
		
		// Save to Supabase
		await saveDeveloperSettingsToSupabase(settings);
		
		console.log('Developer settings saved to both localStorage and Supabase');
	} catch (error) {
		console.error('Failed to save developer settings to Supabase, saving to localStorage only:', error);
		// Fallback to localStorage only
		localStorage.setItem("developerSettings", JSON.stringify(settings));
	}
}

async function saveDeveloperSettingsToSupabase(settings: DeveloperSettings): Promise<void> {
	try {
		const userId = getCurrentUserId();
		
		// Convert to Supabase format
		const settingsData = {
			gatewayLogging: settings.gatewayLogging,
			gatewayCompression: settings.gatewayCompression,
			showTraces: settings.showTraces,
			interceptApiTraces: settings.interceptApiTraces,
			cacheSourceMaps: settings.cacheSourceMaps,
			logBannedFields: settings.logBannedFields,
			reportSystem: settings.reportSystem
		};
		
		const result = await setDevSettingsInSupabase(userId, settingsData);
		
		if (result) {
			console.log('Developer settings saved to Supabase successfully');
		} else {
			throw new Error('Failed to save developer settings to Supabase');
		}
	} catch (error) {
		console.error('Error saving developer settings to Supabase:', error);
		throw error;
	}
}

//region Migration from untyped storage
async function migrateOldDeveloperSettings(): Promise<void> {
	const devSettings = getDeveloperSettings();
	let mod = false;

	const oldGatewayLogging = localStorage.getItem("logGateway");
	if (oldGatewayLogging !== null) {
		devSettings.gatewayLogging = oldGatewayLogging === "true";
		localStorage.removeItem("logGateway");
		mod = true;
	}

	const oldGatewayCompression = localStorage.getItem("gateWayComp");
	if (oldGatewayCompression !== null) {
		devSettings.gatewayCompression = oldGatewayCompression === "true";
		localStorage.removeItem("gateWayComp");
		mod = true;
	}

	const oldShowTraces = localStorage.getItem("traces");
	if (oldShowTraces !== null) {
		devSettings.showTraces = oldShowTraces === "true";
		localStorage.removeItem("traces");
		mod = true;
	}

	const oldInterceptApiTraces = localStorage.getItem("capTrace");
	if (oldInterceptApiTraces !== null) {
		devSettings.interceptApiTraces = oldInterceptApiTraces === "true";
		localStorage.removeItem("capTrace");
		mod = true;
	}

	const oldCacheSourceMaps = localStorage.getItem("isDev");
	if (oldCacheSourceMaps !== null) {
		devSettings.cacheSourceMaps = oldCacheSourceMaps === "true";
		localStorage.removeItem("isDev");
		mod = true;
	}

	const oldLogBannedFields = localStorage.getItem("logbad");
	if (oldLogBannedFields !== null) {
		devSettings.logBannedFields = oldLogBannedFields === "true";
		localStorage.removeItem("logbad");
		mod = true;
	}

	if (mod) {
		setDeveloperSettings(devSettings);
	}
}
await migrateOldDeveloperSettings();
//endregion
