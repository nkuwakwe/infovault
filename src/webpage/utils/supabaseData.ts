// Supabase data operations
// This module handles all database operations for user instances and preferences

let supabaseClient: any = null;

async function getSupabaseClient() {
	if (!supabaseClient) {
		// Initialize real Supabase client
		const { createClient } = await import('@supabase/supabase-js');
		supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
	}
	return supabaseClient;
}

// Get Supabase URL and key from environment variables
const SUPABASE_URL = 'https://vkgkqcsjgiyadivuxosp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ErhOA0SIFaLJKXAIovqu8A_CSaXxW7q';

export interface UserInstance {
	user_id: string;
	instance_name: string;
	server_urls: {
		wellknown: string;
		api: string;
		cdn: string;
		gateway: string;
		login?: string;
	};
	token: string;
	email: string;
	pfpsrc?: string;
	localuser_store?: any;
}

export interface UserPreferences {
	user_id: string;
	locale: string;
	theme: string;
	accent_color?: string;
	animate_gifs?: string;
	animate_icons?: string;
	volume?: number;
	notisound?: string;
}

export interface DeveloperSettings {
	user_id: string;
	settings: Record<string, any>;
}

export interface LocalSettings {
	user_id: string;
	service_worker_mode?: string;
	settings: Record<string, any>;
}

/**
 * Get all user instances for a given user
 */
export async function getUserInstances(userId: string): Promise<UserInstance[]> {
	try {
		const client = await getSupabaseClient();
		const { data, error } = await client
			.from('user_instances')
			.select('*')
			.eq('user_id', userId);

		if (error) {
			console.error('Error fetching user instances:', error);
			return [];
		}

		return data || [];
	} catch (error) {
		console.error('Failed to fetch user instances:', error);
		return [];
	}
}

/**
 * Create or update a user instance
 */
export async function upsertUserInstance(instance: UserInstance): Promise<UserInstance | null> {
	try {
		const client = await getSupabaseClient();
		const { data, error } = await client
			.from('user_instances')
			.upsert(instance)
			.select()
			.single();

		if (error) {
			console.error('Error upserting user instance:', error);
			return null;
		}

		return data;
	} catch (error) {
		console.error('Failed to upsert user instance:', error);
		return null;
	}
}

/**
 * Delete a user instance
 */
export async function deleteUserInstance(userId: string, instanceName: string): Promise<boolean> {
	try {
		const client = await getSupabaseClient();
		const { error } = await client
			.from('user_instances')
			.delete()
			.eq('user_id', userId)
			.eq('instance_name', instanceName);

		if (error) {
			console.error('Error deleting user instance:', error);
			return false;
		}

		return true;
	} catch (error) {
		console.error('Failed to delete user instance:', error);
		return false;
	}
}

/**
 * Get user preferences
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
	try {
		const client = await getSupabaseClient();
		const { data, error } = await client
			.from('user_preferences')
			.select('*')
			.eq('user_id', userId)
			.single();

		if (error) {
			console.error('Error fetching user preferences:', error);
			return null;
		}

		return data;
	} catch (error) {
		console.error('Failed to fetch user preferences:', error);
		return null;
	}
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences | null> {
	try {
		const client = await getSupabaseClient();
		const { data, error } = await client
			.from('user_preferences')
			.upsert({
				user_id: userId,
				...preferences
			})
			.select()
			.single();

		if (error) {
			console.error('Error updating user preferences:', error);
			return null;
		}

		return data;
	} catch (error) {
		console.error('Failed to update user preferences:', error);
		return null;
	}
}

/**
 * Create user preferences if they don't exist
 */
export async function createUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences | null> {
	try {
		const client = await getSupabaseClient();
		const { data, error } = await client
			.from('user_preferences')
			.insert({
				user_id: userId,
				...preferences
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating user preferences:', error);
			return null;
		}

		return data;
	} catch (error) {
		console.error('Failed to create user preferences:', error);
		return null;
	}
}

export interface UptimeData {
	instance_name: string;
	online: boolean;
	timestamp?: string;
	created_at?: string;
}

/**
 * Get uptime data for an instance
 */
export async function getUptimeData(instanceName: string, limit?: number): Promise<UptimeData[]> {
	try {
		const client = await getSupabaseClient();
		let query = client
			.from('uptime_data')
			.select('*')
			.eq('instance_name', instanceName)
			.order('timestamp', { ascending: false });
		
		if (limit) {
			query = query.limit(limit);
		}

		const { data, error } = await query;

		if (error) {
			console.error('Error fetching uptime data:', error);
			return [];
		}

		return data || [];
	} catch (error) {
		console.error('Failed to fetch uptime data:', error);
		return [];
	}
}

/**
 * Insert uptime data
 */
export async function insertUptimeData(data: Omit<UptimeData, 'timestamp' | 'created_at'> & { timestamp?: string }): Promise<boolean> {
	try {
		const client = await getSupabaseClient();
		const { error } = await client
			.from('uptime_data')
			.insert({
				...data,
				timestamp: data.timestamp || new Date().toISOString()
			});

		if (error) {
			console.error('Error inserting uptime data:', error);
			return false;
		}

		return true;
	} catch (error) {
		console.error('Failed to insert uptime data:', error);
		return false;
	}
}

/**
 * Get developer settings for a user
 */
export async function getDeveloperSettings(userId: string): Promise<DeveloperSettings | null> {
	try {
		const client = await getSupabaseClient();
		const { data, error } = await client
			.from('developer_settings')
			.select('*')
			.eq('user_id', userId)
			.single();

		if (error) {
			console.error('Error fetching developer settings:', error);
			return null;
		}

		return data;
	} catch (error) {
		console.error('Failed to fetch developer settings:', error);
		return null;
	}
}

/**
 * Update developer settings
 */
export async function setDeveloperSettings(userId: string, settings: Record<string, any>): Promise<DeveloperSettings | null> {
	try {
		const client = await getSupabaseClient();
		const { data, error } = await client
			.from('developer_settings')
			.upsert({
				user_id: userId,
				settings
			})
			.select()
			.single();

		if (error) {
			console.error('Error updating developer settings:', error);
			return null;
		}

		return data;
	} catch (error) {
		console.error('Failed to update developer settings:', error);
		return null;
	}
}

/**
 * Get local settings for a user
 */
export async function getLocalSettings(userId: string): Promise<LocalSettings | null> {
	try {
		const client = await getSupabaseClient();
		const { data, error } = await client
			.from('local_settings')
			.select('*')
			.eq('user_id', userId)
			.single();

		if (error) {
			console.error('Error fetching local settings:', error);
			return null;
		}

		return data;
	} catch (error) {
		console.error('Failed to fetch local settings:', error);
		return null;
	}
}

/**
 * Update local settings
 */
export async function setLocalSettings(userId: string, settings: Partial<LocalSettings>): Promise<LocalSettings | null> {
	try {
		const client = await getSupabaseClient();
		const { data, error } = await client
			.from('local_settings')
			.upsert({
				user_id: userId,
				...settings
			})
			.select()
			.single();

		if (error) {
			console.error('Error updating local settings:', error);
			return null;
		}

		return data;
	} catch (error) {
		console.error('Failed to update local settings:', error);
		return null;
	}
}

export const supabaseData = {
	getUserInstances,
	upsertUserInstance,
	deleteUserInstance,
	getUserPreferences,
	updateUserPreferences,
	createUserPreferences,
	getUptimeData,
	insertUptimeData,
	getDeveloperSettings,
	setDeveloperSettings,
	getLocalSettings,
	setLocalSettings
};
