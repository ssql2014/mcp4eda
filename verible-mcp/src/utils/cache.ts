import { LRUCache } from 'lru-cache';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import { logger } from './logger.js';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  fileHash?: string;
  dependencies?: string[];
}

export interface CacheOptions {
  maxSize?: number;
  ttl?: number;
  updateAgeOnGet?: boolean;
  checkFileModification?: boolean;
}

export class CacheManager {
  private cache: LRUCache<string, CacheEntry<any>>;
  private fileHashes: Map<string, string> = new Map();

  constructor(options: CacheOptions = {}) {
    this.cache = new LRUCache({
      max: options.maxSize || 500,
      ttl: options.ttl || 1000 * 60 * 60, // 1 hour default
      updateAgeOnGet: options.updateAgeOnGet ?? true,
    });
  }

  /**
   * Generate a cache key from tool name and parameters
   */
  generateKey(tool: string, params: any): string {
    const normalized = JSON.stringify(params, Object.keys(params).sort());
    return `${tool}:${crypto.createHash('md5').update(normalized).digest('hex')}`;
  }

  /**
   * Get an item from cache
   */
  async get<T>(key: string, filePath?: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if file has been modified
    if (filePath && entry.fileHash) {
      const currentHash = await this.getFileHash(filePath);
      if (currentHash !== entry.fileHash) {
        logger.debug(`Cache invalidated for ${key}: file modified`);
        this.cache.delete(key);
        return null;
      }
    }

    // Check dependencies
    if (entry.dependencies) {
      for (const dep of entry.dependencies) {
        const depHash = await this.getFileHash(dep);
        const cachedDepHash = this.fileHashes.get(dep);
        if (depHash !== cachedDepHash) {
          logger.debug(`Cache invalidated for ${key}: dependency ${dep} modified`);
          this.cache.delete(key);
          return null;
        }
      }
    }

    logger.debug(`Cache hit for ${key}`);
    return entry.data as T;
  }

  /**
   * Set an item in cache
   */
  async set<T>(
    key: string,
    data: T,
    filePath?: string,
    dependencies?: string[]
  ): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      dependencies,
    };

    if (filePath) {
      entry.fileHash = await this.getFileHash(filePath);
    }

    // Cache dependency hashes
    if (dependencies) {
      for (const dep of dependencies) {
        const hash = await this.getFileHash(dep);
        this.fileHashes.set(dep, hash);
      }
    }

    this.cache.set(key, entry);
    logger.debug(`Cache set for ${key}`);
  }

  /**
   * Clear specific cache entries
   */
  clear(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      this.fileHashes.clear();
      logger.info('Cache cleared');
      return;
    }

    // Clear entries matching pattern
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    logger.info(`Cleared ${count} cache entries matching pattern: ${pattern}`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    // LRUCache v10 doesn't expose hits/misses directly
    // We'll track our own stats or just return basic info
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      calculatedItemCount: this.cache.calculatedSize,
    };
  }

  /**
   * Calculate file hash
   */
  private async getFileHash(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath);
      return crypto.createHash('md5').update(content).digest('hex');
    } catch (error) {
      logger.warn(`Failed to hash file ${filePath}:`, error);
      return '';
    }
  }

  /**
   * Create a cached version of an async function
   */
  createCachedFunction<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    keyGenerator: (...args: Parameters<T>) => string,
    options?: {
      ttl?: number;
      filePathExtractor?: (...args: Parameters<T>) => string | undefined;
    }
  ): T {
    return (async (...args: Parameters<T>) => {
      const key = keyGenerator(...args);
      const filePath = options?.filePathExtractor?.(...args);

      // Try to get from cache
      const cached = await this.get(key, filePath);
      if (cached !== null) {
        return cached;
      }

      // Execute function and cache result
      const result = await fn(...args);
      await this.set(key, result, filePath);
      
      return result;
    }) as T;
  }
}