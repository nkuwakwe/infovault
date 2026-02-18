/**
 * Performance optimization utilities for Supabase WebSocket Gateway
 */

/**
 * Event batching for reducing network calls
 */
export class EventBatcher {
    private batch: any[] = [];
    private batchSize: number;
    private batchTimeout: number;
    private timeoutId: NodeJS.Timeout | null = null;
    private processBatch: (batch: any[]) => void;

    constructor(batchSize: number = 10, batchTimeout: number = 100, processBatch: (batch: any[]) => void) {
        this.batchSize = batchSize;
        this.batchTimeout = batchTimeout;
        this.processBatch = processBatch;
    }

    /**
     * Add event to batch
     */
    add(event: any): void {
        this.batch.push(event);

        // Process immediately if batch is full
        if (this.batch.length >= this.batchSize) {
            this.flush();
        } else {
            // Set timeout to process batch after delay
            if (!this.timeoutId) {
                this.timeoutId = setTimeout(() => {
                    this.flush();
                }, this.batchTimeout);
            }
        }
    }

    /**
     * Flush current batch
     */
    flush(): void {
        if (this.batch.length === 0) return;

        const batch = [...this.batch];
        this.batch = [];
        
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }

        this.processBatch(batch);
    }

    /**
     * Clear batch without processing
     */
    clear(): void {
        this.batch = [];
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }
}

/**
 * Memory-efficient cache with LRU eviction
 */
export class LRUCache<K, V> {
    private cache = new Map<K, V>();
    private maxSize: number;

    constructor(maxSize: number = 100) {
        this.maxSize = maxSize;
    }

    /**
     * Get value from cache
     */
    get(key: K): V | undefined {
        const value = this.cache.get(key);
        if (value !== undefined) {
            // Move to end (most recently used)
            this.cache.delete(key);
            this.cache.set(key, value);
        }
        return value;
    }

    /**
     * Set value in cache
     */
    set(key: K, value: V): void {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.maxSize) {
            // Remove least recently used (first item)
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }

    /**
     * Check if key exists
     */
    has(key: K): boolean {
        return this.cache.has(key);
    }

    /**
     * Delete key from cache
     */
    delete(key: K): boolean {
        return this.cache.delete(key);
    }

    /**
     * Clear cache
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get cache size
     */
    get size(): number {
        return this.cache.size;
    }
}

/**
 * Debounced function execution
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            func(...args);
        }, wait);
    };
}

/**
 * Throttled function execution
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle = false;

    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}

/**
 * Memory usage monitor
 */
export class MemoryMonitor {
    private samples: { timestamp: number; memory: number }[] = [];
    private maxSamples: number = 100;
    private monitoringInterval: NodeJS.Timeout | null = null;

    /**
     * Start monitoring memory usage
     */
    start(intervalMs: number = 5000): void {
        this.stop();
        
        this.monitoringInterval = setInterval(() => {
            const memory = this.getMemoryUsage();
            this.samples.push({
                timestamp: Date.now(),
                memory
            });

            // Keep only recent samples
            if (this.samples.length > this.maxSamples) {
                this.samples = this.samples.slice(-this.maxSamples);
            }
        }, intervalMs);
    }

    /**
     * Stop monitoring
     */
    stop(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }

    /**
     * Get current memory usage
     */
    getMemoryUsage(): number {
        if (performance.memory) {
            return performance.memory.usedJSHeapSize;
        }
        return 0;
    }

    /**
     * Get memory statistics
     */
    getStats(): {
        current: number;
        average: number;
        peak: number;
        samples: number;
    } {
        if (this.samples.length === 0) {
            return {
                current: this.getMemoryUsage(),
                average: 0,
                peak: 0,
                samples: 0
            };
        }

        const memories = this.samples.map(s => s.memory);
        return {
            current: this.getMemoryUsage(),
            average: memories.reduce((a, b) => a + b, 0) / memories.length,
            peak: Math.max(...memories),
            samples: this.samples.length
        };
    }

    /**
     * Clear samples
     */
    clear(): void {
        this.samples = [];
    }
}

/**
 * Performance metrics collector
 */
export class PerformanceMetrics {
    private metrics: Map<string, { count: number; totalTime: number; minTime: number; maxTime: number }> = new Map();

    /**
     * Record operation performance
     */
    record(operation: string, duration: number): void {
        const existing = this.metrics.get(operation);
        
        if (existing) {
            existing.count++;
            existing.totalTime += duration;
            existing.minTime = Math.min(existing.minTime, duration);
            existing.maxTime = Math.max(existing.maxTime, duration);
        } else {
            this.metrics.set(operation, {
                count: 1,
                totalTime: duration,
                minTime: duration,
                maxTime: duration
            });
        }
    }

    /**
     * Get statistics for an operation
     */
    getStats(operation: string): {
        count: number;
        averageTime: number;
        minTime: number;
        maxTime: number;
        totalTime: number;
    } | null {
        const metric = this.metrics.get(operation);
        if (!metric) return null;

        return {
            count: metric.count,
            averageTime: metric.totalTime / metric.count,
            minTime: metric.minTime,
            maxTime: metric.maxTime,
            totalTime: metric.totalTime
        };
    }

    /**
     * Get all metrics
     */
    getAllStats(): Record<string, ReturnType<typeof this.getStats>> {
        const result: Record<string, ReturnType<typeof this.getStats>> = {};
        
        for (const [operation] of this.metrics) {
            result[operation] = this.getStats(operation);
        }
        
        return result;
    }

    /**
     * Clear all metrics
     */
    clear(): void {
        this.metrics.clear();
    }

    /**
     * Measure function execution time
     */
    async measure<T>(operation: string, fn: () => Promise<T> | T): Promise<T> {
        const startTime = performance.now();
        try {
            const result = await fn();
            const duration = performance.now() - startTime;
            this.record(operation, duration);
            return result;
        } catch (error) {
            const duration = performance.now() - startTime;
            this.record(`${operation}_error`, duration);
            throw error;
        }
    }
}

/**
 * Connection pool for managing multiple WebSocket connections
 */
export class ConnectionPool {
    private connections: Map<string, any> = new Map();
    private maxConnections: number;
    private connectionTimeout: number;

    constructor(maxConnections: number = 5, connectionTimeout: number = 10000) {
        this.maxConnections = maxConnections;
        this.connectionTimeout = connectionTimeout;
    }

    /**
     * Get or create connection
     */
    async getConnection(key: string, factory: () => Promise<any>): Promise<any> {
        let connection = this.connections.get(key);
        
        if (connection) {
            return connection;
        }

        // Check if we've reached max connections
        if (this.connections.size >= this.maxConnections) {
            // Remove oldest connection
            const oldestKey = this.connections.keys().next().value;
            this.removeConnection(oldestKey);
        }

        // Create new connection
        connection = await Promise.race([
            factory(),
            new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Connection timeout')), this.connectionTimeout);
            })
        ]);

        this.connections.set(key, connection);
        return connection;
    }

    /**
     * Remove connection
     */
    removeConnection(key: string): void {
        const connection = this.connections.get(key);
        if (connection && typeof connection.close === 'function') {
            connection.close();
        }
        this.connections.delete(key);
    }

    /**
     * Close all connections
     */
    async closeAll(): Promise<void> {
        const closePromises = Array.from(this.connections.values()).map(conn => {
            if (conn && typeof conn.close === 'function') {
                return conn.close();
            }
        });

        await Promise.allSettled(closePromises);
        this.connections.clear();
    }

    /**
     * Get pool statistics
     */
    getStats(): {
        activeConnections: number;
        maxConnections: number;
        connectionKeys: string[];
    } {
        return {
            activeConnections: this.connections.size,
            maxConnections: this.maxConnections,
            connectionKeys: Array.from(this.connections.keys())
        };
    }
}

/**
 * Create performance optimizer instance
 */
export function createPerformanceOptimizer() {
    return {
        EventBatcher,
        LRUCache,
        debounce,
        throttle,
        MemoryMonitor,
        PerformanceMetrics,
        ConnectionPool
    };
}
