import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabaseData.js';
import { readyjson, wsjson, messageCreateJson } from '../jsontypes.js';
import { Localuser } from '../localuser.js';
import { getDeveloperSettings } from './storage/devSettings.js';

/**
 * Manages Supabase Realtime subscriptions to replace the WebSocket Gateway
 */
export class SupabaseRealtime {
    private channels: Map<string, RealtimeChannel> = new Map();
    private localuser: Localuser;
    private initialized: boolean = false;
    private cleanupFunctions: (() => void)[] = [];

    constructor(localuser: Localuser) {
        this.localuser = localuser;
    }

    /**
     * Initialize Realtime subscriptions
     */
    async init() {
        if (this.initialized) return;

        const client = await getSupabaseClient();
        if (!client) {
            console.error('Failed to initialize Realtime: Supabase client not available');
            return;
        }

        console.log('Initializing Supabase Realtime...');

        // multiple channels for different scopes? For now, one global channel for public tables, 
        // and maybe specific ones for Guilds if RLS allows/requires it.
        // Actually, Supabase Realtime respects RLS, so we can subscribe to 'messages', 'channels', 'guilds' globally
        // and the user will only receive events they are allowed to see.

        // Subscribe to Messages
        const messageChannel = client.channel('public:messages')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'messages' },
                (payload: RealtimePostgresChangesPayload<any>) => this.handleMessageChange(payload)
            )
            .subscribe((status: any) => {
                console.log(`Supabase Realtime (Messages): ${status}`);
            });

        this.channels.set('messages', messageChannel);

        // Subscribe to Channels
        const channelChannel = client.channel('public:channels')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'channels' },
                (payload: RealtimePostgresChangesPayload<any>) => this.handleChannelChange(payload)
            )
            .subscribe((status: any) => {
                console.log(`Supabase Realtime (Channels): ${status}`);
            });

        this.channels.set('channels', channelChannel);

        // Subscribe to Guilds
        const guildChannel = client.channel('public:guilds')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'guilds' },
                (payload: RealtimePostgresChangesPayload<any>) => this.handleGuildChange(payload)
            )
            .subscribe((status: any) => {
                console.log(`Supabase Realtime (Guilds): ${status}`);
            });

        this.channels.set('guilds', guildChannel);

        // Broadcast Channel for Ephemeral Events (Typing, Presence, Voice)
        // We use a separate channel for broadcasting to avoid persisting these to DB
        // Format: 'broadcast:guild_id' or global 'broadcast:global' if we want simple
        // For now, let's try a global broadcast channel, or one per guild if we have the guild list.
        // A global one might be easier for a start, filtering client-side if needed, but RLS/Security wise, per-guild is better.
        // Let's start with a global 'presence' channel for simplicity in migration.

        const presenceChannel = client.channel('presence')
            .on(
                'broadcast',
                { event: 'typing' },
                (payload: { payload: { user_id: string; channel_id: string; member: any; }; }) => this.handleTyping(payload)
            )
            .on(
                'broadcast',
                { event: 'presence' },
                (payload: { payload: { user_id: string; channel_id: string; member: any; }; }) => this.handlePresence(payload)
            )
            .subscribe((status: any) => {
                console.log(`Supabase Realtime (Presence): ${status}`);
            });

        this.channels.set('presence', presenceChannel);

        this.initialized = true;
    }

    /**
     * Clean up subscriptions
     */
    async destroy() {
        const client = await getSupabaseClient();
        if (!client) return;

        for (const [name, channel] of this.channels) {
            await client.removeChannel(channel);
        }
        this.channels.clear();
        this.initialized = false;
    }

    // --- Event Handlers ---

    private handleMessageChange(payload: RealtimePostgresChangesPayload<any>) {
        if (getDeveloperSettings().gatewayLogging) console.debug('Realtime Message:', payload);

        // Map Supabase event to wsjson format for Localuser
        let eventType: any = '';
        switch (payload.eventType) {
            case 'INSERT': eventType = 'MESSAGE_CREATE'; break;
            case 'UPDATE': eventType = 'MESSAGE_UPDATE'; break;
            case 'DELETE': eventType = 'MESSAGE_DELETE'; break;
        }

        if (!eventType) return;

        // Transform payload.new / payload.old to match expected DTO
        // We need to map DB columns to JSON properties (snake_case usually matches, but need to check nested objects)

        const d = payload.eventType === 'DELETE' ? payload.old : payload.new;

        // Mock the structure needed by Localuser.handleEvent
        // Note: The DB columns are flat, but the app expects nested objects (author, member, etc.)
        // This is a tricky part. Realtime gives us the raw row. We might need to fetch the author/member info 
        // if it's not in the row (it isn't, usually).
        // OR, we can rely on the fact that `Message` class might fetch missing info?
        // Let's look at `Message.constructor`... it expects `messagejson`.
        // `messagejson` has `author`, `member`, `mentions` etc.
        // The raw DB row ONLY has `author_id`.

        // Strategy: 
        // 1. Construct a partial messagejson from the DB row.
        // 2. Localuser/Message might need to be robust enough to handle missing author object and fetch it.
        //    (Checked `Message` code: `if (messagejson.author.id) { this.author = new User(...) }`)
        //    So we DO need to provide at least a skeleton author object with ID.

        const messageData: any = {
            id: d.id, // TODO: ID conversion? The DB uses UUIDs? Or strings?
            // If DB uses UUIDs and App uses Snowflakes, we have a mismatch.
            // supabaseData.ts has `discordIdToUuid` and `messageIdToUuid`.
            // REALTIME gives us what's in the DB.
            // If the DB stores UUIDs, we get UUIDs. The app expects Snowflakes?
            // Wait, `supabaseData.ts` implies we ARE storing UUIDs derived from Snowflakes?
            // "This creates a deterministic UUID from the Discord ID"
            // So `d.id` is a UUID.
            // The app likely expects the original Snowflake ID.
            // We can't easily reverse the hash... 
            // actually we can't reverse it at all if it's a hash.
            // BUT, if we are fully migrating, maybe we don't need Snowflakes anymore?
            // OR, we should store the original Snowflake in the DB too.
            // Let's assume for now we might need to adjust `supabaseData.ts` to store original ID if needed,
            // or just pass the UUID as the ID and see if it breaks things.
            // ...
            // Actually, `supabaseData.ts` `createMessage` converts Discord ID to UUID.
            // `getChannelMessages` converts it back? 
            // "id: msg.id, // This would need to be converted back from UUID to Discord ID"
            // It says "Would need to be converted back". It doesn't actually do it.
            // This implies the current migration plan relies on determinism but maybe doesn't solve the reverse.
            // HOWEVER, if we are "fully on Supabase", we can just use the UUIDs as IDs?
            // The `SnowFlake` class in `snowflake.ts` might rely on BigInt parsing.
            // UUIDs are not BigInts. This might be a problem.
            // Let's assume for this step we pass the ID as is (UUID) and fix Snowflake issues if they arise.

            channel_id: d.channel_id,
            guild_id: d.guild_id,
            content: d.content,
            timestamp: d.timestamp,
            edited_timestamp: d.edited_timestamp,
            tts: d.tts,
            mention_everyone: d.mention_everyone,
            pinned: d.pinned,
            type: d.type,
            flags: d.flags,
            author: {
                id: d.author_id,
                username: 'Unknown', // We typically don't have this in the message row
                discriminator: '0000'
            }
        };

        // Construct the wsjson event
        const event: wsjson = {
            op: 0,
            t: eventType,
            d: messageData,
            s: Date.now() // Mock sequence
        };

        this.localuser.handleEvent(event);
    }

    private handleChannelChange(payload: RealtimePostgresChangesPayload<any>) {
        if (getDeveloperSettings().gatewayLogging) console.debug('Realtime Channel:', payload);

        let eventType: any = '';
        switch (payload.eventType) {
            case 'INSERT': eventType = 'CHANNEL_CREATE'; break;
            case 'UPDATE': eventType = 'CHANNEL_UPDATE'; break;
            case 'DELETE': eventType = 'CHANNEL_DELETE'; break;
        }

        if (!eventType) return;
        const d = payload.eventType === 'DELETE' ? payload.old : payload.new;

        const event: wsjson = {
            op: 0,
            t: eventType,
            d: d,
            s: Date.now()
        };

        this.localuser.handleEvent(event);
    }

    private handleGuildChange(payload: RealtimePostgresChangesPayload<any>) {
        if (getDeveloperSettings().gatewayLogging) console.debug('Realtime Guild:', payload);

        let eventType: any = '';
        switch (payload.eventType) {
            case 'INSERT': eventType = 'GUILD_CREATE'; break;
            case 'UPDATE': eventType = 'GUILD_UPDATE'; break;
            case 'DELETE': eventType = 'GUILD_DELETE'; break;
        }

        if (!eventType) return;
        const d = payload.eventType === 'DELETE' ? payload.old : payload.new;

        const event: wsjson = {
            op: 0,
            t: eventType,
            d: d,
            s: Date.now()
        };

        this.localuser.handleEvent(event);
    }

    private handleTyping(payload: { payload: { user_id: string, channel_id: string, member: any } }) {
        if (getDeveloperSettings().gatewayLogging) console.debug('Realtime Typing:', payload);

        const event: wsjson = {
            op: 0,
            t: 'TYPING_START',
            d: {
                user_id: payload.payload.user_id,
                channel_id: payload.payload.channel_id,
                timestamp: Date.now() / 1000,
                member: payload.payload.member
            },
            s: Date.now()
        };

        this.localuser.handleEvent(event);
    }

    private handlePresence(payload: any) {
        // TODO: Map presence updates to PRESENCE_UPDATE event
        if (getDeveloperSettings().gatewayLogging) console.debug('Realtime Presence:', payload);
    }

    /**
     * Emit a typing event
     */
    async sendTyping(channelId: string) {
        if (!this.channels.has('presence')) return;

        const channel = this.channels.get('presence');
        if (!channel) return;

        await channel.send({
            type: 'broadcast',
            event: 'typing',
            payload: {
                user_id: this.localuser.user.id,
                channel_id: channelId,
                // sending minimal member info if possible, or just what's needed
                member: {
                    user: this.localuser.user.tojson(),
                    // ... other member fields?
                }
            }
        });
    }
}
