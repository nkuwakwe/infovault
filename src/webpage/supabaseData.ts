// Supabase data operations
// This module handles all database operations for user instances and preferences

// Get Supabase URL and keys from environment variables
const SUPABASE_URL = typeof process !== 'undefined' && process.env?.SUPABASE_URL || 'https://vkgkqcsjgiyadivuxosp.supabase.co';
const SUPABASE_ANON_KEY = typeof process !== 'undefined' ? process.env?.SUPABASE_ANON_KEY : undefined;
const SUPABASE_SERVICE_ROLE_KEY = typeof process !== 'undefined' ? process.env?.SUPABASE_SERVICE_ROLE_KEY : undefined;

// Use service role key for admin operations (bypasses RLS)
let SUPABASE_KEY = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
	console.warn('Missing Supabase credentials in environment variables. Using fallback key.');
	// Fallback key for development - should be moved to .env in production
	const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrZ2txY3NqZ2l5YWRpdnV4b3NwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODkwODIxNywiZXhwIjoyMDg0NDg0MjE3fQ.nK2z8ekYbvLTPAe7XlizCdyaM-gQXxSaY9rT7m18wtM';
	SUPABASE_KEY = fallbackKey;
}

let supabaseClient: any = null;
let supabasePromise: Promise<any> | null = null;

async function getSupabaseClient() {
	if (!supabaseClient) {
		if (!supabasePromise) {
			supabasePromise = loadSupabaseClient();
		}
		supabaseClient = await supabasePromise;
	}
	return supabaseClient;
}

async function loadSupabaseClient() {
	try {
		// Try to load from CDN first
		if (typeof window !== 'undefined') {
			// Load Supabase from CDN
			await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js');
			if ((window as any).supabase) {
				return (window as any).supabase.createClient(SUPABASE_URL, SUPABASE_KEY!);
			}
		}
		
		// Fallback to dynamic import for server-side
		const { createClient } = await import('@supabase/supabase-js');
		return createClient(SUPABASE_URL, SUPABASE_KEY!);
	} catch (error) {
		console.error('Failed to load Supabase client:', error);
		throw error;
	}
}

function loadScript(src: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.src = src;
		script.onload = () => resolve();
		script.onerror = reject;
		document.head.appendChild(script);
	});
}

/**
 * Convert Discord snowflake ID to a UUID-like format for Supabase
 * This creates a deterministic UUID from the Discord ID
 */
export function discordIdToUuid(discordId: string): string {
	// Create a simple UUID-like format from the Discord ID
	// This ensures the same Discord ID always maps to the same UUID
	const hash = discordId.padStart(20, '0').substring(0, 20);
	const uuid = `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-000000000000`;
	return uuid;
}

/**
 * Create a guild in Supabase
 * Note: Uses discord_guild_id to store Discord guild ID for unique identification
 */
export async function createGuild(guild: Omit<Guild, 'id'>): Promise<Guild | null> {
	try {
		const client = await getSupabaseClient();
		
		// Prepare guild data with Discord guild ID
		const guildData = {
			name: guild.name,
			description: guild.description || null,
			icon: guild.icon || null,
			banner: guild.banner || null,
			splash: guild.splash || null,
			owner_id: null, // Set to null to avoid foreign key constraint
			discord_guild_id: guild.discord_guild_id, // Store Discord guild ID here
			region: guild.region || null,
			preferred_locale: guild.preferred_locale || 'en-US',
			features: guild.features || [],
			verification_level: guild.verification_level || 0,
			default_message_notifications: guild.default_message_notifications || 0,
			explicit_content_filter: guild.explicit_content_filter || 0,
			mfa_level: guild.mfa_level || 0,
			premium_tier: guild.premium_tier || 0,
			premium_progress_bar_enabled: guild.premium_progress_bar_enabled || false,
			nsfw: guild.nsfw || false,
			large: guild.large || false,
			member_count: guild.member_count || 1,
			max_members: guild.max_members || 100000,
			max_video_channel_users: guild.max_video_channel_users || 25,
			afk_channel_id: guild.afk_channel_id || null,
			afk_timeout: guild.afk_timeout || 300,
			system_channel_id: guild.system_channel_id || null,
			system_channel_flags: guild.system_channel_flags || 0,
			rules_channel_id: guild.rules_channel_id || null,
			public_updates_channel_id: guild.public_updates_channel_id || null,
			vanity_url_code: guild.vanity_url_code || null,
			discovery_splash: guild.discovery_splash || null,
			safety_alerts_channel_id: guild.safety_alerts_channel_id || null,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		};
		
		const { data, error } = await client
			.from('guilds')
			.insert(guildData)
			.select()
			.single();

		if (error) {
			console.error('Error creating guild:', error);
			return null;
		}

		return data;
	} catch (error) {
		console.error('Failed to create guild:', error);
		return null;
	}
}

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

export interface Guild {
	id?: string;
	name: string;
	description?: string;
	icon?: string;
	banner?: string;
	splash?: string;
	owner_id?: string; // Optional UUID for Supabase auth users
	discord_guild_id?: string; // Discord guild ID as string
	region?: string;
	preferred_locale?: string;
	features?: string[];
	verification_level?: number;
	default_message_notifications?: number;
	explicit_content_filter?: number;
	mfa_level?: number;
	premium_tier?: number;
	premium_progress_bar_enabled?: boolean;
	nsfw?: boolean;
	large?: boolean;
	member_count?: number;
	max_members?: number;
	max_video_channel_users?: number;
	afk_channel_id?: string;
	afk_timeout?: number;
	system_channel_id?: string;
	system_channel_flags?: number;
	rules_channel_id?: string;
	public_updates_channel_id?: string;
	vanity_url_code?: string;
	discovery_splash?: string;
	safety_alerts_channel_id?: string;
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


/**
 * Delete a guild from Supabase by Discord guild ID
 */
export async function deleteGuild(discordGuildId: string): Promise<boolean> {
	try {
		const client = await getSupabaseClient();
		console.log('Attempting to delete guild from Supabase by Discord guild ID:', discordGuildId);
		
		// First find the guild by discord_guild_id
		const { data: guildData, error: findError } = await client
			.from('guilds')
			.select('id')
			.eq('discord_guild_id', discordGuildId)
			.single();

		if (findError) {
			console.error('Error finding guild:', findError);
			return false;
		}

		if (!guildData) {
			console.log('Guild not found in Supabase for Discord guild ID:', discordGuildId);
			return false; // Not an error, just doesn't exist
		}

		console.log('Found guild in Supabase:', guildData.id, 'now deleting...');

		// Now delete by the Supabase discord_guild_id
		const { data, error } = await client
			.from('guilds')
			.delete()
			.eq('discord_guild_id', guildData.discord_guild_id);

		console.log('Supabase delete response:', { data, error });

		if (error) {
			console.error('Error deleting guild:', error);
			return false;
		}

		console.log('Guild successfully deleted from Supabase:', guildData.id);
		return true;
	} catch (error) {
		console.error('Failed to delete guild:', error);
		return false;
	}
}

/**
 * Get a guild by ID
 */
export async function getGuild(guildId: string): Promise<Guild | null> {
	try {
		const client = await getSupabaseClient();
		const { data, error } = await client
			.from('guilds')
			.select('*')
			.eq('id', guildId)
			.single();

		if (error) {
			console.error('Error fetching guild:', error);
			return null;
		}

		return data;
	} catch (error) {
		console.error('Failed to fetch guild:', error);
		return null;
	}
}

/**
 * Get all guilds for a user
 */
export async function getUserGuilds(ownerId: string): Promise<Guild[]> {
	try {
		const client = await getSupabaseClient();
		const { data, error } = await client
			.from('guilds')
			.select('*')
			.eq('discord_guild_id', ownerId)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Error fetching user guilds:', error);
			return [];
		}

		return data || [];
	} catch (error) {
		console.error('Failed to fetch user guilds:', error);
		return [];
	}
}

/**
 * Get guild by Discord ID and return updated name
 */
export async function getGuildName(discordGuildId: string): Promise<string | null> {
	try {
		const client = await getSupabaseClient();
		console.log('Looking for guild with discord_guild_id:', discordGuildId);
		
		// Try to find guild by discord_guild_id, but use maybeSingle() instead of single()
		const { data, error } = await client
			.from('guilds')
			.select('name, discord_guild_id')
			.eq('discord_guild_id', discordGuildId)
			.maybeSingle(); // Use maybeSingle() to handle 0 rows

		console.log('Guild query result:', { data, error });

		if (error) {
			console.error('Error fetching guild name:', error);
			return null;
		}

		if (!data) {
			console.log('No guild found in Supabase for discord_guild_id:', discordGuildId);
			return null;
		}

		console.log('Found guild name:', data.name);
		return data.name;
	} catch (error) {
		console.error('Failed to fetch guild name:', error);
		return null;
	}
}

/**
 * Debug function to list all guilds in Supabase
 */
export async function debugListAllGuilds(): Promise<any[]> {
	try {
		const client = await getSupabaseClient();
		const { data, error } = await client
			.from('guilds')
			.select('id, name, discord_guild_id')
			.limit(10);

		if (error) {
			console.error('Error listing guilds:', error);
			return [];
		}

		console.log('All guilds in Supabase:', data);
		return data || [];
	} catch (error) {
		console.error('Failed to list guilds:', error);
		return [];
	}
}

/**
 * Update guild name in Supabase
 */
export async function updateGuildName(discordGuildId: string, newName: string): Promise<boolean> {
	try {
		const client = await getSupabaseClient();
		
		// First find the guild by discord_guild_id
		const { data: guildData, error: findError } = await client
			.from('guilds')
			.select('id')
			.eq('discord_guild_id', discordGuildId)
			.single();

		if (findError) {
			console.error('Error finding guild for name update:', findError);
			return false;
		}

		if (!guildData) {
			console.log('Guild not found in Supabase for Discord guild ID:', discordGuildId);
			return false;
		}

		// Update the name
		const { error } = await client
			.from('guilds')
			.update({ 
				name: newName,
				updated_at: new Date().toISOString()
			})
			.eq('id', guildData.id);

		if (error) {
			console.error('Error updating guild name:', error);
			return false;
		}

		console.log('Guild name successfully updated in Supabase:', newName);
		return true;
	} catch (error) {
		console.error('Failed to update guild name:', error);
		return false;
	}
}

// Update guild icon in database
export async function updateGuildIcon(guildId: string, iconUrl: string): Promise<boolean> {
	try {
		const supabase = await getSupabaseClient();
		
		const { error } = await supabase
			.from('guilds')
			.update({ icon: iconUrl })
			.eq('id', guildId);

		if (error) {
			console.error('Failed to update guild icon in database:', error);
			return false;
		}

		console.log('Guild icon successfully updated in database:', iconUrl);
		return true;
	} catch (error) {
		console.error('Error updating guild icon in database:', error);
		return false;
	}
}

// Upload guild icon to Supabase storage
export async function uploadGuildIcon(guildId: string, file: File): Promise<string | null> {
	try {
		const supabase = await getSupabaseClient();
		const fileExtension = file.name.split('.').pop() || 'png';
		const filePath = `guild-icons/${guildId}.${fileExtension}`;
		
		console.log(`Uploading guild icon for ${guildId} → guild-assets/${filePath}`);
		
		const { data, error } = await supabase.storage
			.from('guild-assets')
			.upload(filePath, file, {
				cacheControl: '3600',
				upsert: true,
				contentType: file.type
			});

		if (error) {
			console.error('Upload failed:', error.message);
			if (error.message.includes('Unauthorized')) {
				console.log('→ Check: bucket policies, RLS, or you used wrong key?');
			} else if (error.message.includes('does not exist')) {
				console.log('→ Bucket "guild-assets" does not exist yet – create it in dashboard first.');
			}
			return null;
		}

		console.log('Upload successful!', data);

		// Get public URL
		const { data: urlData } = supabase.storage
			.from('guild-assets')
			.getPublicUrl(filePath);

		console.log('Public URL:', urlData.publicUrl);
		return urlData.publicUrl;
	} catch (error) {
		console.error('Failed to upload guild icon:', error);
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
	setLocalSettings,
	createGuild,
	deleteGuild,
	getGuild,
	getUserGuilds,
	getGuildName,
	updateGuildName,
	debugListAllGuilds,
	uploadGuildIcon,
	updateGuildIcon
};
