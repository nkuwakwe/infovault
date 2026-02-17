// User Settings Migration Utilities
// This module handles migration of user settings from localStorage to Supabase

import { getUserPreferences, updateUserPreferences, createUserPreferences, setDeveloperSettings, setLocalSettings } from '../supabaseData.js';

/**
 * Check if user settings migration is needed
 */
export async function needsUserSettingsMigration(): Promise<boolean> {
	try {
		const userId = getCurrentUserId();
		
		// Check if user preferences exist in Supabase
		const supabasePrefs = await getUserPreferences(userId);
		if (!supabasePrefs) {
			console.log('User preferences need migration');
			return true;
		}
		
		// Check if local settings exist in localStorage and differ from Supabase
		const localPrefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
		const hasLocalPrefs = Object.keys(localPrefs).length > 0;
		
		if (hasLocalPrefs) {
			console.log('Local user preferences found that may need migration');
			return true;
		}
		
		console.log('User settings migration not needed');
		return false;
	} catch (error) {
		console.error('Error checking user settings migration status:', error);
		return true; // Default to migration needed on error
	}
}

/**
 * Get current user ID
 */
function getCurrentUserId(): string {
	// TODO: Get from actual auth context when available
	// For now, use a fallback or get from localStorage
	return localStorage.getItem('currentUserId') || 'anonymous-user';
}

/**
 * Migrate user preferences from localStorage to Supabase
 */
export async function migrateUserPreferences(): Promise<void> {
	try {
		console.log('Starting user preferences migration...');
		
		const userId = getCurrentUserId();
		
		// Get local preferences
		const localPrefsData = localStorage.getItem("userPreferences");
		if (!localPrefsData) {
			console.log('No local user preferences found to migrate');
			return;
		}
		
		const localPrefs = JSON.parse(localPrefsData);
		console.log('Found local user preferences:', localPrefs);
		
		// Convert to Supabase format
		const supabasePrefs = {
			locale: localPrefs.locale || navigator.language || "en",
			theme: localPrefs.theme || "Dark",
			accent_color: localPrefs.accentColor || "#5865F2",
			animate_gifs: localPrefs.animateGifs || "hover",
			animate_icons: localPrefs.animateIcons || "always",
			volume: localPrefs.volume || 50,
			notisound: localPrefs.notisound || "default"
		};
		
		// Try to update first, then create if it doesn't exist
		let result = await updateUserPreferences(userId, supabasePrefs);
		if (!result) {
			result = await createUserPreferences(userId, supabasePrefs);
		}
		
		if (result) {
			console.log('✅ User preferences migrated to Supabase successfully');
			
			// Optionally clear localStorage after successful migration
			// localStorage.removeItem("userPreferences");
		} else {
			throw new Error('Failed to migrate user preferences to Supabase');
		}
	} catch (error) {
		console.error('❌ Failed to migrate user preferences:', error);
		throw error;
	}
}

/**
 * Migrate developer settings from localStorage to Supabase
 */
export async function migrateDeveloperSettings(): Promise<void> {
	try {
		console.log('Starting developer settings migration...');
		
		const userId = getCurrentUserId();
		
		// Get local developer settings
		const localDevData = localStorage.getItem("developerSettings");
		if (!localDevData) {
			console.log('No local developer settings found to migrate');
			return;
		}
		
		const localDevSettings = JSON.parse(localDevData);
		console.log('Found local developer settings:', localDevSettings);
		
		// Convert to Supabase format
		const settingsData = {
			gatewayLogging: localDevSettings.gatewayLogging || false,
			gatewayCompression: localDevSettings.gatewayCompression !== false, // Default true
			showTraces: localDevSettings.showTraces || false,
			interceptApiTraces: localDevSettings.interceptApiTraces || false,
			cacheSourceMaps: localDevSettings.cacheSourceMaps || false,
			logBannedFields: localDevSettings.logBannedFields || false,
			reportSystem: localDevSettings.reportSystem || false
		};
		
		const result = await setDeveloperSettings(userId, settingsData);
		
		if (result) {
			console.log('✅ Developer settings migrated to Supabase successfully');
			
			// Optionally clear localStorage after successful migration
			// localStorage.removeItem("developerSettings");
		} else {
			throw new Error('Failed to migrate developer settings to Supabase');
		}
	} catch (error) {
		console.error('❌ Failed to migrate developer settings:', error);
		throw error;
	}
}

/**
 * Migrate local settings from localStorage to Supabase
 */
export async function migrateLocalSettings(): Promise<void> {
	try {
		console.log('Starting local settings migration...');
		
		const userId = getCurrentUserId();
		
		// Get local settings
		const localData = localStorage.getItem("localSettings");
		if (!localData) {
			console.log('No local settings found to migrate');
			return;
		}
		
		const localSettings = JSON.parse(localData);
		console.log('Found local settings:', localSettings);
		
		// Convert to Supabase format
		const settingsData = {
			service_worker_mode: localSettings.serviceWorkerMode || "unregistered",
			settings: {} // Additional settings can be stored here
		};
		
		const result = await setLocalSettings(userId, settingsData);
		
		if (result) {
			console.log('✅ Local settings migrated to Supabase successfully');
			
			// Optionally clear localStorage after successful migration
			// localStorage.removeItem("localSettings");
		} else {
			throw new Error('Failed to migrate local settings to Supabase');
		}
	} catch (error) {
		console.error('❌ Failed to migrate local settings:', error);
		throw error;
	}
}

/**
 * Migrate all user settings from localStorage to Supabase
 */
export async function migrateAllUserSettings(): Promise<void> {
	try {
		console.log('🚀 Starting complete user settings migration...');
		
		let migratedCount = 0;
		let failedCount = 0;
		
		// Migrate user preferences
		try {
			await migrateUserPreferences();
			migratedCount++;
			console.log('✅ User preferences migrated');
		} catch (error) {
			console.error('❌ Failed to migrate user preferences:', error);
			failedCount++;
		}
		
		// Migrate developer settings
		try {
			await migrateDeveloperSettings();
			migratedCount++;
			console.log('✅ Developer settings migrated');
		} catch (error) {
			console.error('❌ Failed to migrate developer settings:', error);
			failedCount++;
		}
		
		// Migrate local settings
		try {
			await migrateLocalSettings();
			migratedCount++;
			console.log('✅ Local settings migrated');
		} catch (error) {
			console.error('❌ Failed to migrate local settings:', error);
			failedCount++;
		}
		
		console.log(`📊 User settings migration completed:`);
		console.log(`- Migrated: ${migratedCount} setting types`);
		console.log(`- Failed: ${failedCount} setting types`);
		
		if (failedCount > 0) {
			console.warn('Some user settings failed to migrate. Check logs above for details.');
		}
		
		console.log('🎉 Complete user settings migration finished');
	} catch (error) {
		console.error('❌ Complete user settings migration failed:', error);
		throw error;
	}
}

/**
 * Sync user settings between localStorage and Supabase
 * This ensures consistency between local and remote data
 */
export async function syncUserSettings(): Promise<void> {
	try {
		console.log('🔄 Syncing user settings between localStorage and Supabase...');
		
		const userId = getCurrentUserId();
		
		// Get settings from both sources
		const supabasePrefs = await getUserPreferences(userId);
		const localPrefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
		
		// Compare and sync if needed
		if (supabasePrefs && localPrefs) {
			const hasChanges = 
				supabasePrefs.locale !== localPrefs.locale ||
				supabasePrefs.theme !== localPrefs.theme ||
				supabasePrefs.accent_color !== localPrefs.accentColor ||
				supabasePrefs.animate_gifs !== localPrefs.animateGifs ||
				supabasePrefs.animate_icons !== localPrefs.animateIcons;
			
			if (hasChanges) {
				console.log('⚠️  User preferences differ between localStorage and Supabase');
				console.log('Local:', localPrefs);
				console.log('Supabase:', supabasePrefs);
				
				// Use Supabase as source of truth and update local
				const updatedPrefs = {
					...localPrefs,
					locale: supabasePrefs.locale,
					theme: supabasePrefs.theme,
					accentColor: supabasePrefs.accent_color,
					animateGifs: supabasePrefs.animate_gifs,
					animateIcons: supabasePrefs.animate_icons
				};
				
				await setPreferences(updatedPrefs);
				console.log('✅ User preferences synced from Supabase to localStorage');
			} else {
				console.log('✅ User preferences are already in sync');
			}
		}
	} catch (error) {
		console.error('❌ Failed to sync user settings:', error);
	}
}

/**
 * Run complete user settings migration and sync process
 */
export async function runUserSettingsMigration(): Promise<void> {
	try {
		console.log('🚀 Starting complete user settings migration process');
		
		// Step 1: Check if migration is needed
		const needsMigration = await needsUserSettingsMigration();
		
		if (needsMigration) {
			console.log('📦 User settings migration is needed');
			
			// Step 2: Migrate all settings
			await migrateAllUserSettings();
		} else {
			console.log('✅ User settings already exist in Supabase');
		}
		
		// Step 3: Sync settings to ensure consistency
		await syncUserSettings();
		
		console.log('🎉 Complete user settings migration process finished');
	} catch (error) {
		console.error('❌ User settings migration process failed:', error);
	}
}
