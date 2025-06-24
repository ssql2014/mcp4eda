import { LRUCache } from 'lru-cache';
import * as crypto from 'crypto';
import { logger } from './logger.js';

export interface CacheOptions {
  maxSize?: number;
  ttl?: number; // Time to live in milliseconds
}

export class CacheManager {
  private cache: LRUCache<string, any>;

  constructor(options: CacheOptions = {}) {
    this.cache = new LRUCache({
      max: options.maxSize || 500,
      ttl: options.ttl || 1000 * 60 * 30, // 30 minutes default
    });
  }

  /**
   * Generate cache key from parameters
   */
  generateKey(tool: string, params: any): string {
    const keyData = {
      tool,
      params: this.normalizeParams(params),
    };
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(keyData));
    return hash.digest('hex');
  }

  /**
   * Normalize parameters for consistent cache keys
   */
  private normalizeParams(params: any): any {
    if (typeof params !== 'object' || params === null) {
      return params;
    }

    // Sort object keys for consistent hashing
    const sorted: any = {};
    Object.keys(params).sort().forEach(key => {
      sorted[key] = this.normalizeParams(params[key]);
    });
    return sorted;
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      logger.debug(`Cache hit for key: ${key.substring(0, 8)}...`);
    }
    return value;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const options = ttl ? { ttl } : {};
    this.cache.set(key, value, options);
    logger.debug(`Cached value for key: ${key.substring(0, 8)}...`);
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    logger.debug('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hits: number;
    misses: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      hits: 0, // LRUCache doesn't track this by default
      misses: 0,
    };
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidatePattern(pattern: RegExp): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    if (count > 0) {
      logger.debug(`Invalidated ${count} cache entries matching pattern`);
    }
    return count;
  }
}