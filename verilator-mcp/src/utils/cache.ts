import { caching } from 'cache-manager';
import { join } from 'path';
import { homedir } from 'os';
import { promises as fs } from 'fs';
import crypto from 'crypto';
import { logger } from './logger.js';

// @ts-ignore - cache-manager-fs-hash types might be missing
import fsStore from 'cache-manager-fs-hash';

export class CacheManager {
  private cache: any;
  private cacheDir: string;
  private initialized: Promise<void>;

  constructor() {
    this.cacheDir = join(homedir(), '.verilator-mcp', 'cache');
    this.initialized = this.initializeCache();
  }

  private async initializeCache() {
    try {
      // Ensure cache directory exists
      await fs.mkdir(this.cacheDir, { recursive: true });

      this.cache = await caching(fsStore as any, {
        path: this.cacheDir,
        ttl: 60 * 60 * 24, // 24 hours default TTL
        maxsize: 1024 * 1024 * 1024, // 1GB max cache size
        zip: true, // Compress cache files
      } as any);
    } catch (error) {
      logger.error('Cache initialization failed, disabling cache:', error);
      this.cache = null;
    }
  }

  async get<T>(key: string, filePath?: string): Promise<T | null> {
    // Cache disabled temporarily to fix execution issues
    return null;
  }

  async set<T>(
    key: string,
    value: T,
    filePath?: string,
    dependencies?: string[]
  ): Promise<void> {
    // Cache disabled temporarily to fix execution issues
    return;
  }

  async delete(key: string): Promise<void> {
    // Cache disabled temporarily
    return;
  }

  async clear(): Promise<void> {
    // Cache disabled temporarily
    return;
  }

  private async getCacheTime(key: string): Promise<number | null> {
    // Cache disabled temporarily
    return null;
  }

  generateKey(...parts: any[]): string {
    const combined = parts.map(p => JSON.stringify(p)).join(':');
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  async invalidatePattern(pattern: string): Promise<void> {
    // This is a simplified implementation
    // In production, you might want to use a more sophisticated pattern matching
    logger.info(`Invalidating cache entries matching pattern: ${pattern}`);
    // For now, we'll clear the entire cache if a pattern is requested
    await this.clear();
  }

  async getDependencyTime(dependencies: string[]): Promise<number> {
    let maxTime = 0;

    for (const dep of dependencies) {
      try {
        const stat = await fs.stat(dep);
        maxTime = Math.max(maxTime, stat.mtime.getTime());
      } catch {
        // File doesn't exist, ignore
      }
    }

    return maxTime;
  }

  async isValid(key: string, dependencies?: string[]): Promise<boolean> {
    // Cache disabled temporarily
    return false;
  }
}