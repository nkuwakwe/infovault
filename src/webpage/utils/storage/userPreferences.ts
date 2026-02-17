// Async in order to account for maybe some day Spacebar supporting account data...
import { getUserPreferences, updateUserPreferences, createUserPreferences } from '../../supabaseData.js';

export const enum AnimateTristateValue {
	Always = "always",
	OnlyOnHover = "hover",
	Never = "never",
}
export const AnimateTristateValues = [
	AnimateTristateValue.Always,
	AnimateTristateValue.OnlyOnHover,
	AnimateTristateValue.Never,
];

export const enum ThemeOption {
	Dark = "Dark",
	White = "WHITE",
	Light = "Light",
	DarkAccent = "Dark-Accent",
	Gold = "Gold",
}
export const ThemeOptionValues = [
	ThemeOption.Dark,
	ThemeOption.White,
	ThemeOption.Light,
	ThemeOption.DarkAccent,
	ThemeOption.Gold,
];

export class UserPreferences {
	showBlogUpdates?: boolean;
	locale: string = navigator.language || "en";

	// render settings
	animateIcons: AnimateTristateValue = AnimateTristateValue.Always;
	animateGifs: AnimateTristateValue = AnimateTristateValue.OnlyOnHover;
	renderJoinAvatars: boolean = true;
	theme: ThemeOption = ThemeOption.Dark;
	accentColor: string = "#5865F2";
	emojiFont?: string;

	constructor(init?: Partial<UserPreferences>) {
		Object.assign(this, init);
	}
}

// Get current user ID (this should be available from auth context)
function getCurrentUserId(): string {
	// TODO: Get from actual auth context when available
	// For now, use a fallback or get from localStorage
	return localStorage.getItem('currentUserId') || 'anonymous-user';
}

export async function getPreferences(): Promise<UserPreferences> {
	try {
		const userId = getCurrentUserId();
		
		// Try to get from Supabase first
		const supabasePrefs = await getUserPreferences(userId);
		if (supabasePrefs) {
			console.log('Loaded user preferences from Supabase');
			return new UserPreferences(supabasePrefs);
		}
		
		// Fallback to localStorage
		console.log('Loading user preferences from localStorage (fallback)');
		const localPrefs = new UserPreferences(JSON.parse(localStorage.getItem("userPreferences") || "{}"));
		
		// Save to Supabase for future use
		await savePreferencesToSupabase(localPrefs);
		
		return localPrefs;
	} catch (error) {
		console.error('Failed to get preferences from Supabase, using localStorage:', error);
		// Fallback to localStorage
		return new UserPreferences(JSON.parse(localStorage.getItem("userPreferences") || "{}"));
	}
}

export async function setPreferences(prefs: UserPreferences): Promise<void> {
	try {
		// Save to localStorage for offline access
		localStorage.setItem("userPreferences", JSON.stringify(prefs));
		
		// Save to Supabase
		await savePreferencesToSupabase(prefs);
		
		console.log('User preferences saved to both localStorage and Supabase');
	} catch (error) {
		console.error('Failed to save preferences to Supabase, saving to localStorage only:', error);
		// Fallback to localStorage only
		localStorage.setItem("userPreferences", JSON.stringify(prefs));
	}
}

async function savePreferencesToSupabase(prefs: UserPreferences): Promise<void> {
	try {
		const userId = getCurrentUserId();
		
		// Convert to Supabase format
		const supabasePrefs = {
			locale: prefs.locale,
			theme: prefs.theme,
			accent_color: prefs.accentColor,
			animate_gifs: prefs.animateGifs,
			animate_icons: prefs.animateIcons,
			volume: 50, // Default value - could be added to UserPreferences class
			notisound: 'default' // Default value - could be added to UserPreferences class
		};
		
		// Try to update first, then create if it doesn't exist
		let result = await updateUserPreferences(userId, supabasePrefs);
		if (!result) {
			result = await createUserPreferences(userId, supabasePrefs);
		}
		
		if (result) {
			console.log('User preferences saved to Supabase successfully');
		} else {
			throw new Error('Failed to save preferences to Supabase');
		}
	} catch (error) {
		console.error('Error saving preferences to Supabase:', error);
		throw error;
	}
}

//region Migration from untyped storage
async function migrateOldPreferences(): Promise<void> {
	const prefs = await getPreferences();
	const oldBlogUpdates = localStorage.getItem("blogUpdates");
	let mod = false;

	if (oldBlogUpdates !== null) {
		prefs.showBlogUpdates = oldBlogUpdates === "Yes";
		localStorage.removeItem("blogUpdates");
		mod = true;
	}

	const oldAnimateGifs = localStorage.getItem("gifSetting");
	if (oldAnimateGifs !== null) {
		prefs.animateGifs = oldAnimateGifs as AnimateTristateValue;
		localStorage.removeItem("gifSetting");
		mod = true;
	}

	const oldAnimateIcons = localStorage.getItem("iconSetting");
	if (oldAnimateIcons !== null) {
		prefs.animateIcons = oldAnimateIcons as AnimateTristateValue;
		localStorage.removeItem("iconSetting");
		mod = true;
	}

	const oldTheme = localStorage.getItem("theme");
	if (oldTheme !== null) {
		prefs.theme = oldTheme as ThemeOption;
		localStorage.removeItem("theme");
		mod = true;
	}

	const oldLocale = localStorage.getItem("locale");
	if (oldLocale !== null) {
		prefs.locale = oldLocale;
		localStorage.removeItem("locale");
		mod = true;
	}

	const oldEmojiFont = localStorage.getItem("emoji-font");
	if (oldEmojiFont !== null) {
		prefs.emojiFont = oldEmojiFont;
		localStorage.removeItem("emoji-font");
		mod = true;
	}

	if (mod) {
		// TODO: proper saving and versioning and crap...
		localStorage.setItem("userPreferences", JSON.stringify(prefs));
	}
}

await migrateOldPreferences();
//endregion
