// Supabase data operations
// This module handles all database operations for user instances and preferences

import { channeljson } from './jsontypes';

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
 * Convert Discord channel ID to a UUID-like format for Supabase
 * This creates a deterministic UUID from the Discord channel ID
 */
export function channelIdToUuid(channelId: string): string {
	// Create a simple UUID-like format from the Discord channel ID
	// This ensures the same Discord channel ID always maps to the same UUID
	const hash = channelId.padStart(20, '0').substring(0, 20);
	const uuid = `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-111111111111`;
	return uuid;
}

/**
 * Create a guild in Supabase
 * Note: Uses guild_id to store Discord guild ID for unique identification
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
			guild_id: guild.guild_id, // Store Discord guild ID here
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

		console.log('Guild created successfully:', data);

		// Create a default "general" channel for the new guild
		// Use the guild ID from the created guild data
		if (data && data.guild_id) {
			try {
				const generalChannel = await createDefaultGeneralChannel(data.guild_id);
				if (generalChannel) {
					console.log('Default general channel created:', generalChannel.id);
				} else {
					console.warn('Failed to create default general channel');
				}
			} catch (error) {
				console.error('Error creating default general channel:', error);
			}
		} else {
			console.warn('Cannot create default general channel: guild_id is undefined');
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
	guild_id?: string; // Discord guild ID as string
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
	created_at?: string;
	updated_at?: string;
	guild_owner_id?: string;
}

export interface Channel {
	channel_id: string;
	id: string;
	guild_id: string;
	name: string;
	type: number; // 0 = text, 2 = voice, etc.
	topic?: string;
	nsfw?: boolean;
	position?: number;
	bitrate?: number;
	user_limit?: number;
	rate_limit_per_user?: number;
	parent_id?: string;
	owner_id?: string;
	last_message_id?: string;
	last_pin_timestamp?: string;
	default_auto_archive_duration?: number;
	flags?: number;
	video_quality_mode?: number;
	created_at?: string;
	updated_at?: string;
	icon?: string;
	permission_overwrites?: {
		id: string;
		allow: string;
		deny: string;
	}[];
	retention_policy_id?: string;
	default_thread_rate_limit_per_user?: number;
}

/**
 * Create a channel in Supabase
 */
export async function createChannel(channel: channeljson & { guild_id: string }): Promise<Channel | null> {
	try {
		const client = await getSupabaseClient();
		
		console.log('createChannel called with data:', channel);
		
		// Prepare channel data with Discord channel ID
		const channelData = {
			channel_id: channel.id, // Store Discord channel ID
			guild_id: channel.guild_id,
			name: channel.name,
			type: channel.type || 0,
			topic: channel.topic || null,
			nsfw: channel.nsfw || false,
			position: channel.position || 0,
			bitrate: channel.bitrate || 64000,
			user_limit: channel.user_limit || 0,
			rate_limit_per_user: channel.rate_limit_per_user || 0,
			parent_id: channel.parent_id || null,
			owner_id: channel.owner_id || null,
			last_message_id: channel.last_message_id || null,
			last_pin_timestamp: channel.last_pin_timestamp || null,
			default_auto_archive_duration: channel.default_auto_archive_duration || 1440,
			flags: channel.flags || 0,
			video_quality_mode: channel.video_quality_mode || 1,
			icon: channel.icon || null,
			permission_overwrites: channel.permission_overwrites || [],
			retention_policy_id: channel.retention_policy_id || null,
			default_thread_rate_limit_per_user: channel.default_thread_rate_limit_per_user || 0,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		};

		console.log('Channel data prepared for insertion:', channelData);

		const { data, error } = await client
			.from('channels')
			.insert(channelData)
			.select()
			.single();

		console.log('Supabase insert response:', { data, error });

		if (error) {
			console.error('Error creating channel:', error);
			return null;
		}

		console.log('Channel successfully created in database:', data);
		return data;
	} catch (error) {
		console.error('Failed to create channel:', error);
		return null;
	}
}

/**
 * Get channels for a guild from Supabase
 */
export async function getGuildChannels(guildId: string): Promise<any[]> {
	try {
		const client = await getSupabaseClient();
		
		const { data, error } = await client
			.from('channels')
			.select('*')
			.eq('guild_id', guildId)
			.order('position', { ascending: true });

		if (error) {
			console.error('Error fetching guild channels:', error);
			return [];
		}

		// Transform database data to match channeljson structure
		return (data || []).map((channel: { channel_id: any; id: any; name: any; type: any; guild_id: any; topic: any; nsfw: any; position: any; parent_id: any; rate_limit_per_user: any; last_message_id: any; last_pin_timestamp: any; default_auto_archive_duration: any; flags: any; video_quality_mode: any; created_at: any; owner_id: any; }) => ({
			id: channel.channel_id, // Use channel_id as the ID
			name: channel.name,
			type: channel.type,
			guild_id: channel.guild_id,
			topic: channel.topic || '',
			nsfw: channel.nsfw || false,
			position: channel.position || 0,
			parent_id: channel.parent_id || '',
			rate_limit_per_user: channel.rate_limit_per_user || 0,
			last_message_id: channel.last_message_id || '',
			last_pin_timestamp: channel.last_pin_timestamp || '',
			default_auto_archive_duration: channel.default_auto_archive_duration || 1440,
			flags: channel.flags || 0,
			video_quality_mode: channel.video_quality_mode || 1,
			created_at: channel.created_at || new Date().toISOString(),
			// Add required fields with defaults
			icon: '',
			permission_overwrites: [],
			retention_policy_id: '',
			default_thread_rate_limit_per_user: 0,
			owner_id: channel.owner_id || ''
		}));
	} catch (error) {
		console.error('Failed to fetch guild channels:', error);
		return [];
	}
}

/**
 * Create a default "general" channel for a new guild
 */
export async function createDefaultGeneralChannel(guildId: string): Promise<Channel | null> {
	try {
		const client = await getSupabaseClient();
		
		// Directly insert default general channel without calling createChannel
		const channelData = {
			channel_id: channelIdToUuid(Date.now().toString()),
			guild_id: guildId,
			name: 'general',
			type: 0, // Text channel
			topic: 'General discussion',
			position: 0,
			nsfw: false,
			permission_overwrites: [],
			retention_policy_id: undefined,
			default_thread_rate_limit_per_user: 0
		};

		const { data, error } = await client
			.from('channels')
			.insert(channelData)
			.select()
			.single();

		if (error) {
			console.error('Error creating default general channel:', error);
			return null;
		}

		console.log('Default general channel created:', data);
		return data;
	} catch (error) {
		console.error('Failed to create default general channel:', error);
		return null;
	}
}

/**
 * Check if channel exists in database by Discord channel ID
 */
export async function channelExistsByDiscordId(discordId: string): Promise<boolean> {
	try {
		const client = await getSupabaseClient();
		
		// Since we don't have a Discord ID column, we need to check by name and guild_id
		// This is a workaround until we add a discord_id column
		const { data, error } = await client
			.from('channels')
			.select('name, guild_id')
			.eq('guild_id', discordId) // This won't work, we need guild_id
			.limit(1);

		if (error) {
			console.error('Error checking if channel exists:', error);
			return false;
		}

		return data && data.length > 0;
	} catch (error) {
		console.error('Failed to check channel existence:', error);
		return false;
	}
}

/**
 * Get channel name from Supabase by channel ID
 */
export async function getChannelName(channelId: string): Promise<string | null> {
	try {
		const client = await getSupabaseClient();
		console.log('Looking for channel with channel_id:', channelId);
		
		const { data, error } = await client
			.from('channels')
			.select('name')
			.eq('channel_id', channelId) // Use Discord channel_id column
			.single();

		if (error) {
			console.error('Error finding channel:', error);
			return null;
		}

		if (!data) {
			console.log('Channel not found in Supabase for channel_id:', channelId);
			return null;
		}

		console.log('Found channel in Supabase:', data.name);
		return data.name;
	} catch (error) {
		console.error('Failed to get channel name:', error);
		return null;
	}
}

/**
 * Update channel name in database
 */
export async function updateChannelName(channelId: string, newName: string): Promise<boolean> {
	try {
		const client = await getSupabaseClient();
		
		const { error } = await client
			.from('channels')
			.update({ 
				name: newName,
				updated_at: new Date().toISOString()
			})
			.eq('channel_id', channelId) // Use Discord channel_id column

		if (error) {
			console.error('Failed to update channel name in database:', error);
			return false;
		}

		console.log('Channel name successfully updated in database:', newName);
		return true;
	} catch (error) {
		console.error('Error updating channel name in database:', error);
		return false;
	}
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
		
		// First find the guild by guild_id
		const { data: guildData, error: findError } = await client
			.from('guilds')
			.select('id')
			.eq('guild_id', discordGuildId)
			.single();

		if (findError) {
			console.error('Error finding guild:', findError);
			return false;
		}

		if (!guildData) {
			console.log('Guild not found in Supabase for Discord guild ID:', discordGuildId);
			return false; // Not an error, just doesn't exist
		}

		console.log('Found guild in Supabase with ID:', guildData.id, 'now deleting...');

		// Delete by the Supabase primary key 'id' field, not guild_id
		const { data, error } = await client
			.from('guilds')
			.delete()
			.eq('id', guildData.id);

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
			.eq('guild_id', guildId)
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
			.eq('guild_id', ownerId)
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
		console.log('Looking for guild with guild_id:', discordGuildId);
		
		// Try to find guild by guild_id, but use maybeSingle() instead of single()
		const { data, error } = await client
			.from('guilds')
			.select('name, guild_id')
			.eq('guild_id', discordGuildId)
			.maybeSingle(); // Use maybeSingle() to handle 0 rows

		console.log('Guild query result:', { data, error });

		if (error) {
			console.error('Error fetching guild name:', error);
			return null;
		}

		if (!data) {
			console.log('No guild found in Supabase for guild_id:', discordGuildId);
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
			.select('id, name, guild_id')
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
		
		// First find the guild by guild_id
		const { data: guildData, error: findError } = await client
			.from('guilds')
			.select('id')
			.eq('guild_id', discordGuildId)
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
			.eq('guild_id', discordGuildId);

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
			.eq('guild_id', guildId);

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

// Get guild icon from database
export async function getGuildIcon(guildId: string): Promise<string | null> {
	try {
		const client = await getSupabaseClient();
		const { data, error } = await client
			.from('guilds')
			.select('icon')
			.eq('guild_id', guildId)
			.single();

		if (error) {
			console.error('Error fetching guild icon:', error);
			return null;
		}

		return data?.icon || null;
	} catch (error) {
		console.error('Failed to fetch guild icon:', error);
		return null;
	}
}

// Update guild banner in database
export async function updateGuildBanner(guildId: string, bannerUrl: string): Promise<boolean> {
	try {
		const supabase = await getSupabaseClient();
		
		const { error } = await supabase
			.from('guilds')
			.update({ banner: bannerUrl })
			.eq('guild_id', guildId);

		if (error) {
			console.error('Failed to update guild banner in database:', error);
			return false;
		}

		console.log('Guild banner successfully updated in database:', bannerUrl);
		return true;
	} catch (error) {
		console.error('Error updating guild banner in database:', error);
		return false;
	}
}

// Get guild banner from database
export async function getGuildBanner(guildId: string): Promise<string | null> {
	try {
		const client = await getSupabaseClient();
		const { data, error } = await client
			.from('guilds')
			.select('banner')
			.eq('guild_id', guildId)
			.single();

		if (error) {
			console.error('Error fetching guild banner:', error);
			return null;
		}

		return data?.banner || null;
	} catch (error) {
		console.error('Failed to fetch guild banner:', error);
		return null;
	}
}

// Upload guild banner to Supabase storage
export async function uploadGuildBanner(guildId: string, file: File): Promise<string | null> {
	try {
		const supabase = await getSupabaseClient();
		const fileExtension = file.name.split('.').pop() || 'png';
		const filePath = `guild-banners/${guildId}.${fileExtension}`;
		
		console.log(`Uploading guild banner for ${guildId} → guild-assets/${filePath}`);
		
		const { error } = await supabase.storage
			.from('guild-assets')
			.upload(filePath, file, {
				cacheControl: '3600',
				upsert: true
			});

		if (error) {
			console.error('Error uploading guild banner:', error);
			return null;
		}

		// Get public URL
		const { data: { publicUrl } } = supabase.storage
			.from('guild-assets')
			.getPublicUrl(filePath);

		console.log('Guild banner uploaded successfully:', publicUrl);
		return publicUrl;
	} catch (error) {
		console.error('Failed to upload guild banner:', error);
		return null;
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
	getGuildIcon,
	uploadGuildIcon,
	updateGuildIcon,
	getGuildBanner,
	uploadGuildBanner,
	updateGuildBanner,
	createChannel,
	getGuildChannels,
	createDefaultGeneralChannel,
	getChannelName,
	updateChannelName
};
