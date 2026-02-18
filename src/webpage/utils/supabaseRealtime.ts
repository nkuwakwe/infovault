// Import Supabase types and client using dynamic import for browser compatibility
import { wsjson } from '../jsontypes.js';
import { Localuser } from '../localuser.js';
import { getDeveloperSettings } from './storage/devSettings.js';

// Dynamic imports for Supabase
let supabaseClient: any = null;

const SUPABASE_URL = 'https://vkgkqcsjgiyadivuxosp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrZ2txY3NqZ2l5YWRpdnV4b3NwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODkwODIxNywiZXhwIjoyMDg0NDg0MjE3fQ.nK2z8ekYbvLTPAe7XlizCdyaM-gQXxSaY9rT7m18wtM';

async function loadSupabase() {
    if (!supabaseClient) {
        try {
            // Load Supabase from CDN
            if (typeof window !== 'undefined') {
                await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js');
                if ((window as any).supabase) {
                    supabaseClient = (window as any).supabase.createClient;
                    return;
                }
            }
            
            // Fallback to dynamic import
            const supabase = await import('https://esm.sh/@supabase/supabase-js@2');
            supabaseClient = supabase.createClient;
        } catch (error) {
            console.error('Failed to load Supabase:', error);
            throw error;
        }
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

async function getSupabaseClient() {
    await loadSupabase();
    return supabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/**
 * Real-time event types for better type safety
 */
export enum RealtimeEventType {
    MESSAGE_CREATE = 'MESSAGE_CREATE',
    MESSAGE_UPDATE = 'MESSAGE_UPDATE',
    MESSAGE_DELETE = 'MESSAGE_DELETE',
    CHANNEL_CREATE = 'CHANNEL_CREATE',
    CHANNEL_UPDATE = 'CHANNEL_UPDATE',
    CHANNEL_DELETE = 'CHANNEL_DELETE',
    GUILD_CREATE = 'GUILD_CREATE',
    GUILD_UPDATE = 'GUILD_UPDATE',
    GUILD_DELETE = 'GUILD_DELETE',
    TYPING_START = 'TYPING_START',
    PRESENCE_UPDATE = 'PRESENCE_UPDATE',
    USER_SETTINGS_UPDATE = 'USER_SETTINGS_UPDATE'
}

/**
 * Presence data interface
 */
export interface PresenceData {
    user_id: string;
    status: 'online' | 'idle' | 'dnd' | 'invisible';
    last_seen: number;
    activities?: any[];
}

/**
 * Typing data interface
 */
export interface TypingData {
    user_id: string;
    channel_id: string;
    timestamp: number;
    member?: any;
}

/**
 * Manages Supabase Realtime subscriptions to replace WebSocket Gateway
 */
export class SupabaseRealtime {
    private channels: Map<string, any> = new Map();
    private localuser: Localuser;
    private client: any = null;
    private presenceState: Map<string, any> = new Map();
    private typingTimers: Map<string, NodeJS.Timeout> = new Map();
    private initialized: boolean = false;

    constructor(localuser: Localuser) {
        this.localuser = localuser;
    }

    /**
     * Initialize Realtime subscriptions
     */
    async init() {
        if (this.initialized) return;
        
        try {
            this.client = await getSupabaseClient();
            
            // Subscribe to messages
            const messageChannel = this.client.channel('public:messages');
            messageChannel
                .on('postgres_changes', 
                    { event: '*', schema: 'public', table: 'messages' }, 
                    (payload: any) => this.handleMessageChange(payload)
                )
                .subscribe();
            this.channels.set('messages', messageChannel);

            // Subscribe to channels
            const channelChannel = this.client.channel('public:channels');
            channelChannel
                .on('postgres_changes', 
                    { event: '*', schema: 'public', table: 'channels' }, 
                    (payload: any) => this.handleChannelChange(payload)
                )
                .subscribe();
            this.channels.set('channels', channelChannel);

            // Subscribe to guilds
            const guildChannel = this.client.channel('public:guilds');
            guildChannel
                .on('postgres_changes', 
                    { event: '*', schema: 'public', table: 'guilds' }, 
                    (payload: any) => this.handleGuildChange(payload)
                )
                .subscribe();
            this.channels.set('guilds', guildChannel);

            // Subscribe to presence
            const presenceChannel = this.client.channel('presence');
            presenceChannel
                .on('presence', { event: 'sync' }, 
                    (payload: any) => this.handlePresence(payload)
                )
                .subscribe();
            this.channels.set('presence', presenceChannel);

            // Subscribe to typing
            const typingChannel = this.client.channel('typing');
            typingChannel
                .on('broadcast', { event: 'typing' }, 
                    (payload: any) => this.handleTyping(payload)
                )
                .subscribe();
            this.channels.set('typing', typingChannel);

            // Subscribe to user preferences
            const prefsChannel = this.client.channel('public:user_preferences');
            prefsChannel
                .on('postgres_changes', 
                    { event: '*', schema: 'public', table: 'user_preferences' }, 
                    (payload: any) => this.handleUserSettingsChange(payload)
                )
                .subscribe();
            this.channels.set('user_preferences', prefsChannel);

            this.initialized = true;
            console.log('✅ Supabase Realtime initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Supabase Realtime:', error);
            throw error;
        }
    }

    /**
     * Destroy all subscriptions
     */
    async destroy() {
        try {
            for (const [name, channel] of this.channels) {
                await channel.unsubscribe();
            }
            this.channels.clear();
            this.initialized = false;
            console.log('✅ Supabase Realtime destroyed');
        } catch (error) {
            console.error('❌ Failed to destroy Supabase Realtime:', error);
        }
    }

    /**
     * Handle message changes
     */
    private async handleMessageChange(payload: any) {
        const devSettings = await getDeveloperSettings();
        if (devSettings?.gatewayLogging) console.debug('Realtime Message:', payload);

        // Map Supabase event to wsjson format for Localuser
        let eventType: string = '';
        switch (payload.eventType) {
            case 'INSERT': eventType = RealtimeEventType.MESSAGE_CREATE; break;
            case 'UPDATE': eventType = RealtimeEventType.MESSAGE_UPDATE; break;
            case 'DELETE': eventType = RealtimeEventType.MESSAGE_DELETE; break;
        }

        if (!eventType) return;
        const d = payload.eventType === 'DELETE' ? payload.old : payload.new;

        // Get author information for message events
        let messageData = d;
        if (eventType === RealtimeEventType.MESSAGE_CREATE && d.author_id) {
            try {
                const { data: author } = await this.client
                    .from('users')
                    .select('*')
                    .eq('id', d.author_id)
                    .single();
                
                if (author) {
                    messageData = { ...d, author };
                }
            } catch (error) {
                console.error('Failed to fetch message author:', error);
            }
        }

        // Construct the wsjson event
        const event: wsjson = {
            op: 0,
            t: eventType as any, // Cast to any to match wsjson type
            d: messageData,
            s: Date.now() // Mock sequence
        };

        // Send to Localuser for processing
        this.localuser.handleEvent(event);
    }

    /**
     * Handle channel changes
     */
    private async handleChannelChange(payload: any) {
        const devSettings = await getDeveloperSettings();
        if (devSettings?.gatewayLogging) console.debug('Realtime Channel:', payload);

        let eventType: string = '';
        switch (payload.eventType) {
            case 'INSERT': eventType = RealtimeEventType.CHANNEL_CREATE; break;
            case 'UPDATE': eventType = RealtimeEventType.CHANNEL_UPDATE; break;
            case 'DELETE': eventType = RealtimeEventType.CHANNEL_DELETE; break;
        }

        if (!eventType) return;
        const d = payload.eventType === 'DELETE' ? payload.old : payload.new;

        const event: wsjson = {
            op: 0,
            t: eventType as any, // Cast to any to match wsjson type
            d: d,
            s: Date.now()
        };

        this.localuser.handleEvent(event);
    }

    /**
     * Handle guild changes
     */
    private async handleGuildChange(payload: any) {
        const devSettings = await getDeveloperSettings();
        if (devSettings?.gatewayLogging) console.debug('Realtime Guild:', payload);

        let eventType: string = '';
        switch (payload.eventType) {
            case 'INSERT': eventType = RealtimeEventType.GUILD_CREATE; break;
            case 'UPDATE': eventType = RealtimeEventType.GUILD_UPDATE; break;
            case 'DELETE': eventType = RealtimeEventType.GUILD_DELETE; break;
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

    /**
     * Handle presence updates
     */
    private async handlePresence(payload: any) {
        const devSettings = await getDeveloperSettings();
        if (devSettings?.gatewayLogging) console.debug('Realtime Presence:', payload);

        const event: wsjson = {
            op: 0,
            t: RealtimeEventType.PRESENCE_UPDATE,
            d: payload,
            s: Date.now()
        };

        this.localuser.handleEvent(event);
    }

    /**
     * Handle typing indicators
     */
    private async handleTyping(payload: any) {
        const devSettings = await getDeveloperSettings();
        if (devSettings?.gatewayLogging) console.debug('Realtime Typing:', payload);

        // Clear existing timer for this user
        if (payload.user_id && this.typingTimers.has(payload.user_id)) {
            clearTimeout(this.typingTimers.get(payload.user_id));
        }

        // Set new timer to clear typing after 5 seconds
        const timer = setTimeout(() => {
            this.typingTimers.delete(payload.user_id);
        }, 5000);
        this.typingTimers.set(payload.user_id, timer);

        const event: wsjson = {
            op: 0,
            t: RealtimeEventType.TYPING_START,
            d: payload,
            s: Date.now()
        };

        this.localuser.handleEvent(event);
    }

    /**
     * Handle user settings changes
     */
    private async handleUserSettingsChange(payload: any) {
        const devSettings = await getDeveloperSettings();
        if (devSettings?.gatewayLogging) console.debug('Realtime User Settings:', payload);

        let eventType: string = '';
        switch (payload.eventType) {
            case 'INSERT': 
            case 'UPDATE': 
                eventType = RealtimeEventType.USER_SETTINGS_UPDATE; 
                break;
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

    /**
     * Send typing indicator
     */
    async sendTyping(channelId: string) {
        if (!this.client) return;

        const typingData: TypingData = {
            user_id: this.localuser.user.id,
            channel_id: channelId,
            timestamp: Date.now(),
            member: this.localuser.user.tojson()
        };

        try {
            const typingChannel = this.channels.get('typing');
            if (typingChannel) {
                await typingChannel.send({
                    type: 'broadcast',
                    event: 'typing',
                    payload: typingData
                });
            }
        } catch (error) {
            console.error('Failed to send typing indicator:', error);
        }
    }

    /**
     * Update presence status
     */
    async updatePresence(status: string, activities?: any[]) {
        if (!this.client) return;

        const presenceData: PresenceData = {
            user_id: this.localuser.user.id,
            status: status as any,
            last_seen: Date.now(),
            activities
        };

        try {
            const presenceChannel = this.channels.get('presence');
            if (presenceChannel) {
                await presenceChannel.track(presenceData);
            }
        } catch (error) {
            console.error('Failed to update presence:', error);
        }
    }

    /**
     * Get current presence state
     */
    getPresenceState(): Map<string, any> {
        return new Map(this.presenceState);
    }

    /**
     * Get channel statistics
     */
    getStats(): {
        initialized: boolean;
        channelCount: number;
        presenceCount: number;
        typingCount: number;
    } {
        return {
            initialized: this.initialized,
            channelCount: this.channels.size,
            presenceCount: this.presenceState.size,
            typingCount: this.typingTimers.size
        };
    }
}
