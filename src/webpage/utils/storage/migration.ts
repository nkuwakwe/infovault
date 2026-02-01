// Migration utility for localStorage to Supabase
import { getUserInstances, upsertUserInstance, getUserPreferences, updateUserPreferences, createUserPreferences } from '../supabaseData.js';
import { UserPreferences } from './userPreferences.js';
import { DeveloperSettings } from './devSettings.js';
import { LocalSettings } from './localSettings.js';

interface LocalUserInfos {
	currentuser: string | null;
	users: Record<string, any>;
	preferences: {
		theme: string;
		notifications: boolean;
		notisound: string;
		volume?: number;
		accent_color?: string;
	};
}

async function getCurrentUserId(): Promise<string> {
	// Get current user ID from localStorage or sessionStorage
	const userId = localStorage.getItem('sb_user_id') || sessionStorage.getItem('currentuser');
	if (!userId) {
		throw new Error('User not authenticated');
	}
	return userId;
}

/**
 * Migrate user instances from localStorage to Supabase
 */
export async function migrateUserInstances(): Promise<void> {
	try {
		const userId = await getCurrentUserId();
		const userInfos: LocalUserInfos = JSON.parse(localStorage.getItem('userinfos') || '{"users": {}}');
		
		for (const [instanceName, userData] of Object.entries(userInfos.users)) {
			const instance = {
				user_id: userId,
				instance_name: instanceName,
				server_urls: userData.serverurls,
				token: userData.token,
				email: userData.email,
				pfpsrc: userData.pfpsrc,
				localuser_store: userData.localuser_store
			};
			
			await upsertUserInstance(instance);
			console.log(`Migrated instance: ${instanceName}`);
		}
	} catch (error) {
		console.error('Error migrating user instances:', error);
	}
}

/**
 * Migrate user preferences from localStorage to Supabase
 */
export async function migrateUserPreferences(): Promise<void> {
	try {
		const userId = await getCurrentUserId();
		const userInfos: LocalUserInfos = JSON.parse(localStorage.getItem('userinfos') || '{"preferences": {}}');
		const localPrefs = localStorage.getItem('userPreferences');
		
		// Combine preferences from both sources
		const combinedPrefs = {
			locale: localPrefs ? JSON.parse(localPrefs).locale || 'en' : 'en',
			theme: userInfos.preferences?.theme || 'Dark',
			accent_color: userInfos.preferences?.accent_color || '#5865F2',
			animate_gifs: localPrefs ? JSON.parse(localPrefs).animateGifs || 'hover' : 'hover',
			animate_icons: localPrefs ? JSON.parse(localPrefs).animateIcons || 'always' : 'always',
			volume: userInfos.preferences?.volume || 50,
			notisound: userInfos.preferences?.notisound || 'default'
		};
		
		// Try to update existing preferences first
		const updated = await updateUserPreferences(userId, combinedPrefs);
		if (!updated) {
			// Create new preferences if they don't exist
			await createUserPreferences(userId, combinedPrefs);
		}
		
		console.log('Migrated user preferences');
	} catch (error) {
		console.error('Error migrating user preferences:', error);
	}
}

/**
 * Migrate developer settings from localStorage to Supabase
 */
export async function migrateDeveloperSettings(): Promise<void> {
	try {
		const { setDeveloperSettings } = await import('../supabaseData.js');
		const userId = await getCurrentUserId();
		const localDevSettings = localStorage.getItem('developerSettings');
		
		const settings = localDevSettings ? JSON.parse(localDevSettings) : {};
		
		await setDeveloperSettings(userId, settings);
		console.log('Migrated developer settings');
	} catch (error) {
		console.error('Error migrating developer settings:', error);
	}
}

/**
 * Migrate local settings from localStorage to Supabase
 */
export async function migrateLocalSettings(): Promise<void> {
	try {
		const { setLocalSettings } = await import('../supabaseData.js');
		const userId = await getCurrentUserId();
		const localSettings = localStorage.getItem('localSettings');
		
		const settings = localSettings ? JSON.parse(localSettings) : {};
		
		await setLocalSettings(userId, {
			service_worker_mode: settings.serviceWorkerMode || 'unregistered',
			settings: settings
		});
		
		console.log('Migrated local settings');
	} catch (error) {
		console.error('Error migrating local settings:', error);
	}
}

/**
 * Run complete migration from localStorage to Supabase
 */
export async function runMigration(): Promise<void> {
	console.log('Starting migration from localStorage to Supabase...');
	
	try {
		await migrateUserInstances();
		await migrateUserPreferences();
		await migrateDeveloperSettings();
		await migrateLocalSettings();
		
		console.log('Migration completed successfully!');
		
		// Optionally clear localStorage after successful migration
		// Uncomment the following lines if you want to clear localStorage after migration
		// localStorage.removeItem('userinfos');
		// localStorage.removeItem('userPreferences');
		// localStorage.removeItem('developerSettings');
		// localStorage.removeItem('localSettings');
		
	} catch (error) {
		console.error('Migration failed:', error);
	}
}

/**
 * Check if migration is needed
 */
export async function needsMigration(): Promise<boolean> {
	try {
		const userId = await getCurrentUserId();
		const localData = localStorage.getItem('userinfos');
		const supabaseData = await getUserInstances(userId);
		
		// If we have local data but no Supabase data, migration is needed
		return localData !== null && (!supabaseData || supabaseData.length === 0);
	} catch (error) {
		console.error('Error checking migration status:', error);
		return false;
	}
}
