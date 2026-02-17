// Channel migration utilities
// This module handles migration of channel data from localStorage to Supabase

import { createChannel as createChannelInDb, getGuildChannels, channelExistsByDiscordId } from '../supabaseData.js';

interface ChannelData {
	id: string;
	guild_id: string;
	name: string;
	type: number;
	topic?: string;
	nsfw?: boolean;
	position?: number;
	parent_id?: string;
	rate_limit_per_user?: number;
	last_message_id?: string;
	last_pin_timestamp?: string;
	icon?: string;
	permission_overwrites?: any[];
}

/**
 * Check if channel migration is needed
 */
export async function needsChannelMigration(localUser: any): Promise<boolean> {
	try {
		// Check if we have local channels that might not be in Supabase
		const localChannels = Array.from(localUser.channelids.values());
		
		if (localChannels.length === 0) {
			return false;
		}

		// Check if any local channels don't exist in Supabase
		for (const channel of localChannels) {
			const existsInSupabase = await channelExistsByDiscordId(channel.id);
			if (!existsInSupabase) {
				console.log(`Channel ${channel.id} (${channel.name}) needs migration`);
				return true;
			}
		}

		console.log('All channels already exist in Supabase');
		return false;
	} catch (error) {
		console.error('Error checking channel migration status:', error);
		return false;
	}
}

/**
 * Migrate all channels for a guild to Supabase
 */
export async function migrateGuildChannels(guildId: string, localUser: any): Promise<void> {
	try {
		console.log(`Starting channel migration for guild ${guildId}`);
		
		// Get all local channels for this guild
		const localChannels = Array.from(localUser.channelids.values())
			.filter(channel => channel.guild_id === guildId);

		console.log(`Found ${localChannels.length} local channels to migrate`);

		let migratedCount = 0;
		let failedCount = 0;

		for (const channel of localChannels) {
			try {
				// Check if channel already exists in Supabase
				const existsInSupabase = await channelExistsByDiscordId(channel.id);
				
				if (!existsInSupabase) {
					// Prepare channel data for migration
					const channelData: ChannelData = {
						id: channel.id,
						guild_id: channel.guild_id,
						name: channel.name,
						type: channel.type,
						topic: channel.topic || '',
						nsfw: channel.nsfw || false,
						position: channel.position || 0,
						parent_id: channel.parent_id || null,
						rate_limit_per_user: channel.rate_limit_per_user || 0,
						last_message_id: channel.lastmessageid || null,
						last_pin_timestamp: channel.lastpin || null,
						icon: channel.icon || null,
						permission_overwrites: channel.permission_overwritesar?.map(([roleOrUser, perms]: any) => ({
							id: roleOrUser instanceof Promise ? 'unknown' : roleOrUser.id,
							allow: perms.allow.toString(),
							deny: perms.deny.toString()
						})) || []
					};

					// Create channel in Supabase
					const result = await createChannelInDb(channelData);
					
					if (result) {
						console.log(`✅ Migrated channel: ${channel.name} (${channel.id})`);
						migratedCount++;
					} else {
						console.error(`❌ Failed to migrate channel: ${channel.name} (${channel.id})`);
						failedCount++;
					}
				} else {
					console.log(`⏭️  Channel already exists in Supabase: ${channel.name} (${channel.id})`);
				}
			} catch (error) {
				console.error(`❌ Error migrating channel ${channel.name} (${channel.id}):`, error);
				failedCount++;
			}
		}

		console.log(`Channel migration completed for guild ${guildId}:`);
		console.log(`- Migrated: ${migratedCount} channels`);
		console.log(`- Failed: ${failedCount} channels`);
		
		if (failedCount > 0) {
			console.warn('Some channels failed to migrate. Check the logs above for details.');
		}
	} catch (error) {
		console.error(`Failed to migrate channels for guild ${guildId}:`, error);
	}
}

/**
 * Migrate all channels for all guilds
 */
export async function migrateAllChannels(localUser: any): Promise<void> {
	try {
		console.log('Starting full channel migration for all guilds');
		
		// Get all unique guild IDs from local channels
		const guildIds = new Set(
			Array.from(localUser.channelids.values())
				.map(channel => channel.guild_id)
		);

		console.log(`Found ${guildIds.size} guilds to migrate`);

		for (const guildId of guildIds) {
			await migrateGuildChannels(guildId, localUser);
		}

		console.log('Full channel migration completed');
	} catch (error) {
		console.error('Failed to complete full channel migration:', error);
	}
}

/**
 * Sync channel data between local and Supabase
 * This ensures consistency between local and Supabase data
 */
export async function syncChannelData(guildId: string, localUser: any): Promise<void> {
	try {
		console.log(`Syncing channel data for guild ${guildId}`);
		
		// Get channels from Supabase
		const supabaseChannels = await getGuildChannels(guildId);
		const supabaseChannelMap = new Map(
			supabaseChannels.map(channel => [channel.id, channel])
		);

		// Get local channels
		const localChannels = Array.from(localUser.channelids.values())
			.filter(channel => channel.guild_id === guildId);

		let syncedCount = 0;
		let conflictCount = 0;

		for (const localChannel of localChannels) {
			const supabaseChannel = supabaseChannelMap.get(localChannel.id);
			
			if (supabaseChannel) {
				// Channel exists in both places - check for conflicts
				if (supabaseChannel.name !== localChannel.name) {
					console.log(`⚠️  Name conflict for channel ${localChannel.id}:`);
					console.log(`   Local: "${localChannel.name}"`);
					console.log(`   Supabase: "${supabaseChannel.name}"`);
					conflictCount++;
				}
				
				// Update local channel with Supabase data if needed
				if (supabaseChannel.name !== localChannel.name) {
					localChannel.supabaseName = supabaseChannel.name;
				}
				if (supabaseChannel.icon !== localChannel.supabaseIconUrl) {
					localChannel.supabaseIconUrl = supabaseChannel.icon;
				}
				
				syncedCount++;
			} else {
				// Channel exists locally but not in Supabase
				console.log(`❓ Local channel not in Supabase: ${localChannel.name} (${localChannel.id})`);
			}
		}

		// Check for channels that exist in Supabase but not locally
		for (const [channelId, supabaseChannel] of supabaseChannelMap) {
			const localChannel = localChannels.find(c => c.id === channelId);
			if (!localChannel) {
				console.log(`❓ Supabase channel not found locally: ${supabaseChannel.name} (${channelId})`);
			}
		}

		console.log(`Channel sync completed for guild ${guildId}:`);
		console.log(`- Synced: ${syncedCount} channels`);
		console.log(`- Conflicts: ${conflictCount} channels`);
		
	} catch (error) {
		console.error(`Failed to sync channel data for guild ${guildId}:`, error);
	}
}

/**
 * Run complete channel migration and sync
 */
export async function runChannelMigration(localUser: any): Promise<void> {
	try {
		console.log('🚀 Starting complete channel migration process');
		
		// Step 1: Check if migration is needed
		const needsMigration = await needsChannelMigration(localUser);
		
		if (needsMigration) {
			console.log('📦 Channel migration is needed');
			
			// Step 2: Migrate all channels
			await migrateAllChannels(localUser);
		} else {
			console.log('✅ All channels already exist in Supabase');
		}
		
		// Step 3: Sync all guilds to ensure consistency
		const guildIds = new Set(
			Array.from(localUser.channelids.values())
				.map(channel => channel.guild_id)
		);

		for (const guildId of guildIds) {
			await syncChannelData(guildId, localUser);
		}
		
		console.log('🎉 Complete channel migration process finished');
	} catch (error) {
		console.error('❌ Channel migration process failed:', error);
	}
}
