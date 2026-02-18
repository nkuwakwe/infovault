import { WebSocketGateway } from './websocketGateway.js';
import { getDeveloperSettings } from './storage/devSettings.js';

/**
 * Connection error types
 */
export enum ConnectionErrorType {
    NETWORK_ERROR = 'NETWORK_ERROR',
    AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
    RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
    SERVER_ERROR = 'SERVER_ERROR',
    TIMEOUT_ERROR = 'TIMEOUT_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Connection error information
 */
export interface ConnectionError {
    type: ConnectionErrorType;
    message: string;
    code?: number;
    retryable: boolean;
    timestamp: number;
}

/**
 * Connection status
 */
export enum ConnectionStatus {
    DISCONNECTED = 'DISCONNECTED',
    CONNECTING = 'CONNECTING',
    CONNECTED = 'CONNECTED',
    RECONNECTING = 'RECONNECTING',
    ERROR = 'ERROR'
}

/**
 * Connection manager for WebSocket gateway with comprehensive error handling
 */
export class ConnectionManager {
    private gateway: WebSocketGateway | null = null;
    private status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
    private retryAttempts: number = 0;
    private maxRetryAttempts: number = 10;
    private baseRetryDelay: number = 1000;
    private maxRetryDelay: number = 30000;
    private connectionTimeout: number = 10000;
    private lastError: ConnectionError | null = null;
    private errorHistory: ConnectionError[] = [];
    private maxErrorHistory: number = 50;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private heartbeatTimeout: NodeJS.Timeout | null = null;
    private reconnectTimeout: NodeJS.Timeout | null = null;

    constructor() {
        this.setupEventListeners();
    }

    /**
     * Initialize connection with error handling
     */
    async initialize(gateway: WebSocketGateway): Promise<void> {
        try {
            this.setStatus(ConnectionStatus.CONNECTING);
            this.gateway = gateway;

            // Set connection timeout
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Connection timeout')), this.connectionTimeout);
            });

            // Race between connection and timeout
            await Promise.race([
                gateway.init(),
                timeoutPromise
            ]);

            this.setStatus(ConnectionStatus.CONNECTED);
            this.retryAttempts = 0;
            this.startHeartbeat();
            
            console.log('✅ Connection manager initialized successfully');

        } catch (error) {
            const connectionError = this.classifyError(error);
            this.handleError(connectionError);
            
            if (connectionError.retryable) {
                this.scheduleReconnect();
            } else {
                this.setStatus(ConnectionStatus.ERROR);
            }
            
            throw connectionError;
        }
    }

    /**
     * Close connection with cleanup
     */
    async close(): Promise<void> {
        try {
            this.clearAllTimers();
            
            if (this.gateway) {
                await this.gateway.close();
                this.gateway = null;
            }
            
            this.setStatus(ConnectionStatus.DISCONNECTED);
            console.log('✅ Connection manager closed successfully');
            
        } catch (error) {
            console.error('❌ Error during connection close:', error);
        }
    }

    /**
     * Get current connection status
     */
    getStatus(): ConnectionStatus {
        return this.status;
    }

    /**
     * Get last error
     */
    getLastError(): ConnectionError | null {
        return this.lastError;
    }

    /**
     * Get error history
     */
    getErrorHistory(): ConnectionError[] {
        return [...this.errorHistory];
    }

    /**
     * Get connection statistics
     */
    getStats(): {
        status: ConnectionStatus;
        retryAttempts: number;
        lastError: ConnectionError | null;
        errorCount: number;
        uptime: number | null;
    } {
        return {
            status: this.status,
            retryAttempts: this.retryAttempts,
            lastError: this.lastError,
            errorCount: this.errorHistory.length,
            uptime: this.getUptime()
        };
    }

    /**
     * Force reconnection
     */
    async forceReconnect(): Promise<void> {
        console.log('🔄 Forcing reconnection...');
        
        this.clearAllTimers();
        this.retryAttempts = 0;
        
        if (this.gateway) {
            try {
                await this.gateway.close();
            } catch (error) {
                console.error('❌ Error closing gateway during force reconnect:', error);
            }
        }
        
        this.setStatus(ConnectionStatus.DISCONNECTED);
        await this.scheduleReconnect();
    }

    /**
     * Classify error type and determine retryability
     */
    private classifyError(error: any): ConnectionError {
        const timestamp = Date.now();
        
        if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return {
                type: ConnectionErrorType.NETWORK_ERROR,
                message: error.message || 'Network connection failed',
                code: error.code,
                retryable: true,
                timestamp
            };
        }
        
        if (error.message?.includes('timeout')) {
            return {
                type: ConnectionErrorType.TIMEOUT_ERROR,
                message: error.message,
                code: error.code,
                retryable: true,
                timestamp
            };
        }
        
        if (error.status === 401 || error.status === 403) {
            return {
                type: ConnectionErrorType.AUTHENTICATION_ERROR,
                message: 'Authentication failed',
                code: error.status,
                retryable: false,
                timestamp
            };
        }
        
        if (error.status === 429) {
            return {
                type: ConnectionErrorType.RATE_LIMIT_ERROR,
                message: 'Rate limit exceeded',
                code: error.status,
                retryable: true,
                timestamp
            };
        }
        
        if (error.status >= 500) {
            return {
                type: ConnectionErrorType.SERVER_ERROR,
                message: 'Server error occurred',
                code: error.status,
                retryable: true,
                timestamp
            };
        }
        
        return {
            type: ConnectionErrorType.UNKNOWN_ERROR,
            message: error.message || 'Unknown error occurred',
            code: error.code,
            retryable: true,
            timestamp
        };
    }

    /**
     * Handle connection error
     */
    private handleError(error: ConnectionError): void {
        this.lastError = error;
        this.errorHistory.push(error);
        
        // Trim error history if too long
        if (this.errorHistory.length > this.maxErrorHistory) {
            this.errorHistory = this.errorHistory.slice(-this.maxErrorHistory);
        }
        
        console.error(`❌ Connection error [${error.type}]:`, error.message);
        
        // Log error statistics
        this.logErrorStatistics();
    }

    /**
     * Schedule reconnection with exponential backoff
     */
    private async scheduleReconnect(): Promise<void> {
        if (this.retryAttempts >= this.maxRetryAttempts) {
            console.error('❌ Max retry attempts reached. Giving up.');
            this.setStatus(ConnectionStatus.ERROR);
            return;
        }
        
        this.retryAttempts++;
        this.setStatus(ConnectionStatus.RECONNECTING);
        
        // Calculate delay with exponential backoff and jitter
        const baseDelay = this.baseRetryDelay * Math.pow(2, this.retryAttempts - 1);
        const jitter = Math.random() * 0.1 * baseDelay;
        const delay = Math.min(baseDelay + jitter, this.maxRetryDelay);
        
        console.log(`🔄 Scheduling reconnect in ${Math.round(delay)}ms... (attempt ${this.retryAttempts}/${this.maxRetryAttempts})`);
        
        this.reconnectTimeout = setTimeout(async () => {
            try {
                if (this.gateway) {
                    await this.initialize(this.gateway);
                }
            } catch (error) {
                // Error handling is done in initialize()
            }
        }, delay);
    }

    /**
     * Set connection status
     */
    private setStatus(status: ConnectionStatus): void {
        const oldStatus = this.status;
        this.status = status;
        
        if (oldStatus !== status) {
            console.log(`📊 Connection status changed: ${oldStatus} -> ${status}`);
            this.notifyStatusChange(status);
        }
    }

    /**
     * Start heartbeat to monitor connection health
     */
    private startHeartbeat(): void {
        this.clearHeartbeat();
        
        this.heartbeatInterval = setInterval(() => {
            this.checkConnectionHealth();
        }, 30000); // Check every 30 seconds
    }

    /**
     * Check connection health
     */
    private async checkConnectionHealth(): Promise<void> {
        if (!this.gateway || !this.gateway.isConnected()) {
            console.warn('⚠️ Connection health check failed');
            this.handleConnectionLoss();
            return;
        }
        
        // Additional health checks can be added here
        const stats = this.gateway.getStats();
        if (!stats.connected) {
            this.handleConnectionLoss();
        }
    }

    /**
     * Handle connection loss
     */
    private handleConnectionLoss(): void {
        console.warn('⚠️ Connection lost, attempting to reconnect...');
        this.setStatus(ConnectionStatus.RECONNECTING);
        this.scheduleReconnect();
    }

    /**
     * Clear all timers
     */
    private clearAllTimers(): void {
        this.clearHeartbeat();
        this.clearReconnectTimeout();
    }

    /**
     * Clear heartbeat timers
     */
    private clearHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        
        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
            this.heartbeatTimeout = null;
        }
    }

    /**
     * Clear reconnect timeout
     */
    private clearReconnectTimeout(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }

    /**
     * Get connection uptime
     */
    private getUptime(): number | null {
        if (this.status !== ConnectionStatus.CONNECTED || !this.lastError) {
            return null;
        }
        
        return Date.now() - this.lastError.timestamp;
    }

    /**
     * Log error statistics
     */
    private logErrorStatistics(): void {
        const errorCounts = this.errorHistory.reduce((counts, error) => {
            counts[error.type] = (counts[error.type] || 0) + 1;
            return counts;
        }, {} as Record<string, number>);
        
        console.log('📊 Error statistics:', errorCounts);
    }

    /**
     * Notify status change (can be extended with callbacks)
     */
    private notifyStatusChange(status: ConnectionStatus): void {
        // This can be extended to emit events or call callbacks
        // For now, we just log the change
    }

    /**
     * Setup event listeners for browser events
     */
    private setupEventListeners(): void {
        // Handle online/offline events
        window.addEventListener('online', () => {
            console.log('🌐 Browser went online');
            if (this.status === ConnectionStatus.DISCONNECTED || this.status === ConnectionStatus.ERROR) {
                this.forceReconnect();
            }
        });
        
        window.addEventListener('offline', () => {
            console.log('📵 Browser went offline');
            this.setStatus(ConnectionStatus.DISCONNECTED);
            this.clearAllTimers();
        });
        
        // Handle page visibility change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.status === ConnectionStatus.DISCONNECTED) {
                console.log('👁️ Page became visible, attempting to reconnect...');
                this.forceReconnect();
            }
        });
    }
}

/**
 * Create connection manager instance
 */
export function createConnectionManager(): ConnectionManager {
    return new ConnectionManager();
}
