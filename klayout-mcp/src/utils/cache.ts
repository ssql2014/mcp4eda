import { caching } from 'cache-manager';
import { createHash } from 'crypto';
import { logger } from './logger.js';

export class CacheManager {
  private cache: any;
  private enabled: boolean;

  constructor(enabled: boolean, ttl: number) {
    this.enabled = enabled;
    
    if (this.enabled) {
      this.initializeCache(ttl);
    }
  }

  private async initializeCache(ttl: number): Promise<void> {
    try {
      this.cache = await caching('memory', {
        ttl: ttl * 1000, // Convert to milliseconds
        max: 100, // Maximum number of items in cache
      });
      logger.info('Cache initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize cache:', error);
      this.enabled = false;
    }
  }

  generateKey(prefix: string, params: any): string {
    const hash = createHash('md5');
    hash.update(prefix);
    hash.update(JSON.stringify(params));
    return hash.digest('hex');
  }

  async get<T>(key: string): Promise<T | undefined> {
    if (!this.enabled || !this.cache) {
      return undefined;
    }

    try {
      const value = await this.cache.get(key);
      if (value) {
        logger.debug(`Cache hit for key: ${key}`);
      }
      return value as T;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.enabled || !this.cache) {
      return;
    }

    try {
      await this.cache.set(key, value, ttl);
      logger.debug(`Cache set for key: ${key}`);
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.enabled || !this.cache) {
      return;
    }

    try {
      await this.cache.del(key);
      logger.debug(`Cache deleted for key: ${key}`);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async reset(): Promise<void> {
    if (!this.enabled || !this.cache) {
      return;
    }

    try {
      await this.cache.reset();
      logger.info('Cache reset successfully');
    } catch (error) {
      logger.error('Cache reset error:', error);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}