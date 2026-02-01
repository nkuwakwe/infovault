// Supabase-enabled storage wrapper that works alongside localStorage
import { getUserInstances, upsertUserInstance, deleteUserInstance, getUserPreferences, updateUserPreferences, createUserPreferences } from '../supabaseData.js';

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

class SupabaseStorage {
	private static instance: SupabaseStorage;
	private initialized = false;

	static getInstance(): SupabaseStorage {
		if (!SupabaseStorage.instance) {
			SupabaseStorage.instance = new SupabaseStorage();
		}
		return SupabaseStorage.instance;
	}

	private async getCurrentUserId(): Promise<string> {
		const userId = localStorage.getItem('sb_user_id') || sessionStorage.getItem('currentuser');
		if (!userId) {
			throw new Error('User not authenticated');
		}
		return userId;
	}

	/**
	 * Get user infos - tries Supabase first, falls back to localStorage
	 */
	async getUserInfos(): Promise<LocalUserInfos> {
		try {
			const userId = await this.getCurrentUserId();
			const instances = await getUserInstances(userId);
			
			if (instances && instances.length > 0) {
				// Build user infos from Supabase instances
				const users: Record<string, any> = {};
				for (const instance of instances) {
					users[instance.instance_name] = {
						serverurls: instance.server_urls,
						token: instance.token,
						email: instance.email,
						pfpsrc: instance.pfpsrc,
						localuser_store: instance.localuser_store
					};
				}

				// Get preferences from Supabase
				const prefs = await getUserPreferences(userId);
				const preferences = {
					theme: prefs?.theme || 'Dark',
					notifications: false, // This might need to be added to Supabase schema
					notisound: prefs?.notisound || 'default',
					volume: prefs?.volume || 50,
					accent_color: prefs?.accent_color || '#5865F2'
				};

				return {
					currentuser: localStorage.getItem('currentuser'),
					users,
					preferences
				};
			}
		} catch (error) {
			console.error('Error loading from Supabase, falling back to localStorage:', error);
		}

		// Fallback to localStorage
		const localData = localStorage.getItem('userinfos');
		if (localData) {
			return JSON.parse(localData);
		}

		// Default structure
		return {
			currentuser: null,
			users: {},
			preferences: {
				theme: 'Dark',
				notifications: false,
				notisound: 'default',
				volume: 50,
				accent_color: '#5865F2'
			}
		};
	}

	/**
	 * Save user infos - saves to both Supabase and localStorage for backup
	 */
	async saveUserInfos(userInfos: LocalUserInfos): Promise<void> {
		try {
			const userId = await this.getCurrentUserId();
			
			// Save instances to Supabase
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
			}

			// Save preferences to Supabase
			await updateUserPreferences(userId, {
				theme: userInfos.preferences.theme,
				accent_color: userInfos.preferences.accent_color,
				volume: userInfos.preferences.volume,
				notisound: userInfos.preferences.notisound
			});

			console.log('Saved to Supabase successfully');
		} catch (error) {
			console.error('Error saving to Supabase:', error);
		}

		// Always save to localStorage as backup
		localStorage.setItem('userinfos', JSON.stringify(userInfos));
	}

	/**
	 * Delete user instance
	 */
	async deleteUserInstance(instanceName: string): Promise<void> {
		try {
			const userId = await this.getCurrentUserId();
			await deleteUserInstance(userId, instanceName);
			console.log(`Deleted instance ${instanceName} from Supabase`);
		} catch (error) {
			console.error('Error deleting instance from Supabase:', error);
		}

		// Also remove from localStorage
		const userInfos = JSON.parse(localStorage.getItem('userinfos') || '{"users": {}}');
		if (userInfos.users[instanceName]) {
			delete userInfos.users[instanceName];
			localStorage.setItem('userinfos', JSON.stringify(userInfos));
		}
	}

	/**
	 * Initialize and check if migration is needed
	 */
	async initialize(): Promise<void> {
		if (this.initialized) return;

		try {
			const userId = localStorage.getItem('sb_user_id') || sessionStorage.getItem('currentuser');
			if (!userId) {
				console.log('No user authenticated, skipping Supabase initialization');
				this.initialized = true;
				return;
			}

			const localData = localStorage.getItem('userinfos');
			const supabaseData = await getUserInstances(userId);
			
			if (localData && (!supabaseData || supabaseData.length === 0)) {
				console.log('Migration needed - importing localStorage data to Supabase');
				await this.importFromLocalStorage();
			}
		} catch (error) {
			console.error('Error during Supabase initialization:', error);
		}

		this.initialized = true;
	}

	/**
	 * Import existing localStorage data to Supabase
	 */
	private async importFromLocalStorage(): Promise<void> {
		try {
			const userInfos: LocalUserInfos = JSON.parse(localStorage.getItem('userinfos') || '{"users": {}}');
			const userId = await this.getCurrentUserId();
			
			// Import instances
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
			}

			// Import preferences
			await updateUserPreferences(userId, {
				theme: userInfos.preferences.theme,
				accent_color: userInfos.preferences.accent_color,
				volume: userInfos.preferences.volume,
				notisound: userInfos.preferences.notisound
			});

			console.log('Successfully imported localStorage data to Supabase');
		} catch (error) {
			console.error('Error importing from localStorage:', error);
		}
	}
}

export const supabaseStorage = SupabaseStorage.getInstance();
