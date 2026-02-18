import { wsjson } from '../jsontypes.js';
import { Localuser } from '../localuser.js';
import { getDeveloperSettings } from './storage/devSettings.js';
import { SupabaseRealtime } from './supabaseRealtime.js';
import { ConnectionManager, ConnectionStatus } from './connectionManager.js';

/**
 * WebSocket Gateway replacement using Supabase Realtime
 * This class provides the same interface as the original WebSocket gateway
 * but uses Supabase Realtime for communication instead of Discord WebSocket
 */
export class WebSocketGateway {
    private localuser: Localuser;
    private realtime: SupabaseRealtime;
    private connectionManager: ConnectionManager;
    private connected: boolean = false;
    private eventQueue: wsjson[] = [];
    private isProcessingQueue: boolean = false;

    constructor(localuser: Localuser) {
        this.localuser = localuser;
        this.realtime = new SupabaseRealtime(localuser);
        this.connectionManager = new ConnectionManager();
    }

    /**
     * Initialize the WebSocket gateway replacement
     */
    async init(): Promise<void> {
        try {
            console.log('🔄 Initializing WebSocket Gateway replacement...');
            
            // Use connection manager for initialization with error handling
            await this.connectionManager.initialize(this);
            
            // Initialize Supabase Realtime
            await this.realtime.init();
            
            this.connected = true;
            
            console.log('✅ WebSocket Gateway replacement connected');
            
            // Send ready event to simulate Discord gateway ready
            await this.sendReadyEvent();
            
            // Start processing queued events
            this.processEventQueue();
            
        } catch (error) {
            console.error('❌ Failed to initialize WebSocket Gateway replacement:', error);
            throw error;
        }
    }

    /**
     * Send a WebSocket event (simulated)
     */
    async send(event: wsjson): Promise<void> {
        if (!this.connected) {
            this.eventQueue.push(event);
            return;
        }

        try {
            // For now, we just log the event since Supabase Realtime is receive-only
            const devSettings = await getDeveloperSettings();
            if (devSettings?.gatewayLogging) {
                console.debug('📤 Gateway Event (simulated):', event);
            }
        } catch (error) {
            console.error('❌ Failed to send gateway event:', error);
        }
    }

    /**
     * Close the WebSocket gateway replacement
     */
    async close(): Promise<void> {
        try {
            console.log('🔌 Closing WebSocket Gateway replacement...');
            
            this.connected = false;
            await this.connectionManager.close();
            await this.realtime.destroy();
            
            console.log('✅ WebSocket Gateway replacement closed');
        } catch (error) {
            console.error('❌ Failed to close WebSocket Gateway replacement:', error);
        }
    }

    /**
     * Check if the gateway is connected
     */
    isConnected(): boolean {
        return this.connected && this.connectionManager.getStatus() === ConnectionStatus.CONNECTED;
    }

    /**
     * Get connection status
     */
    getStatus(): 'connecting' | 'connected' | 'disconnected' | 'reconnecting' {
        const managerStatus = this.connectionManager.getStatus();
        switch (managerStatus) {
            case ConnectionStatus.CONNECTING: return 'connecting';
            case ConnectionStatus.CONNECTED: return 'connected';
            case ConnectionStatus.RECONNECTING: return 'reconnecting';
            case ConnectionStatus.ERROR:
            case ConnectionStatus.DISCONNECTED: return 'disconnected';
            default: return 'disconnected';
        }
    }

    /**
     * Send ready event to simulate Discord gateway ready
     */
    private async sendReadyEvent(): Promise<void> {
        const readyEvent: wsjson = {
            op: 0,
            t: 'READY',
            d: {
                v: 9,
                user: this.localuser.user.tojson(),
                guilds: [],
                session_id: 'supabase-session-' + Date.now(),
                resume_gateway_url: 'supabase://realtime',
                shard: [0, 1],
                application: {
                    id: 'supabase-app',
                    flags: 0
                },
                user_settings: {
                    locale: 'en-US',
                    theme: 'dark'
                }
            },
            s: 0
        };

        this.localuser.handleEvent(readyEvent);
    }

    /**
     * Process queued events
     */
    private async processEventQueue(): Promise<void> {
        if (this.isProcessingQueue || this.eventQueue.length === 0) return;

        this.isProcessingQueue = true;

        while (this.eventQueue.length > 0 && this.connected) {
            const event = this.eventQueue.shift();
            if (event) {
                await this.send(event);
            }
        }

        this.isProcessingQueue = false;
    }

    /**
     * Get gateway statistics
     */
    getStats(): {
        connected: boolean;
        queuedEvents: number;
        status: string;
        connectionStats: any;
    } {
        return {
            connected: this.connected,
            queuedEvents: this.eventQueue.length,
            status: this.getStatus(),
            connectionStats: this.connectionManager.getStats()
        };
    }

    /**
     * Reset connection state
     */
    reset(): void {
        this.eventQueue = [];
        this.isProcessingQueue = false;
        this.connectionManager.forceReconnect();
    }
}

/**
 * Factory function to create WebSocket Gateway replacement
 */
export function createWebSocketGateway(localuser: Localuser): WebSocketGateway {
    return new WebSocketGateway(localuser);
}

/**
 * Check if WebSocket Gateway replacement should be used
 */
export function shouldUseWebSocketGateway(): boolean {
    // Check if user has enabled Supabase migration
    return localStorage.getItem('supabase_migration_complete') === 'true' ||
           localStorage.getItem('use_supabase_realtime') === 'true';
}

/**
 * Initialize WebSocket Gateway replacement if needed
 */
export async function initializeWebSocketGateway(localuser: Localuser): Promise<WebSocketGateway | null> {
    if (!shouldUseWebSocketGateway()) {
        console.log('📡 Using original WebSocket gateway');
        return null;
    }

    console.log('🔄 Initializing WebSocket Gateway replacement...');
    const gateway = createWebSocketGateway(localuser);
    await gateway.init();
    
    return gateway;
}
