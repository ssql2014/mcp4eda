import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { ParsedModule } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class CacheDatabase {
  private db: sqlite3.Database;
  private dbPath: string;

  constructor(dbPath?: string) {
    // Use os.homedir() which is more reliable than process.env.HOME
    this.dbPath = dbPath || path.join(os.homedir(), '.rtl-parser-cache.db');
    console.error(`[RTL Parser MCP] Initializing database at: ${this.dbPath}`);
    
    // Use verbose mode for better error messages
    const sqlite = sqlite3.verbose();
    
    try {
      this.db = new sqlite.Database(this.dbPath);
      console.error('[RTL Parser MCP] Database opened successfully');
    } catch (err) {
      console.error('[RTL Parser MCP] Error opening database:', err);
      console.error('[RTL Parser MCP] Current directory:', process.cwd());
      console.error('[RTL Parser MCP] Database path:', this.dbPath);
      throw err;
    }
    
    (this.db as any).run = promisify(this.db.run).bind(this.db);
    (this.db as any).get = promisify(this.db.get).bind(this.db);
    (this.db as any).all = promisify(this.db.all).bind(this.db);
  }

  async initialize(): Promise<void> {
    await this.createTables();
    console.error('[RTL Parser MCP] Cache database initialized');
  }

  private async createTables(): Promise<void> {
    const queries = [
      `CREATE TABLE IF NOT EXISTS parsed_files (
        filepath TEXT PRIMARY KEY,
        last_modified INTEGER,
        content_hash TEXT,
        parse_data TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`,
      
      `CREATE TABLE IF NOT EXISTS modules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        filepath TEXT NOT NULL,
        line INTEGER,
        port_count INTEGER,
        register_count INTEGER,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (filepath) REFERENCES parsed_files(filepath)
      )`,
      
      `CREATE TABLE IF NOT EXISTS registers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        module_name TEXT NOT NULL,
        filepath TEXT NOT NULL,
        type TEXT,
        width INTEGER,
        clock TEXT,
        reset TEXT,
        line INTEGER,
        FOREIGN KEY (filepath) REFERENCES parsed_files(filepath)
      )`,
      
      `CREATE INDEX IF NOT EXISTS idx_modules_name ON modules(name)`,
      `CREATE INDEX IF NOT EXISTS idx_registers_module ON registers(module_name)`,
      `CREATE INDEX IF NOT EXISTS idx_registers_type ON registers(type)`
    ];

    for (const query of queries) {
      await (this.db.run as any)(query);
    }
  }

  async getCachedParse(filepath: string): Promise<ParsedModule[] | null> {
    try {
      const stat = await fs.stat(filepath);
      const row = await (this.db.get as any)(
        'SELECT * FROM parsed_files WHERE filepath = ? AND last_modified = ?',
        [filepath, stat.mtimeMs]
      );

      if (row) {
        return JSON.parse(row.parse_data);
      }
      return null;
    } catch (error) {
      logger.error('Error getting cached parse:', error);
      return null;
    }
  }

  async cacheParse(filepath: string, modules: ParsedModule[]): Promise<void> {
    try {
      const stat = await fs.stat(filepath);
      
      await (this.db.run as any)('BEGIN TRANSACTION');
      
      // Cache the parsed data
      await (this.db.run as any)(
        `INSERT OR REPLACE INTO parsed_files (filepath, last_modified, parse_data) 
         VALUES (?, ?, ?)`,
        [filepath, stat.mtimeMs, JSON.stringify(modules)]
      );

      // Clear old module and register data
      await (this.db.run as any)('DELETE FROM modules WHERE filepath = ?', [filepath]);
      await (this.db.run as any)('DELETE FROM registers WHERE filepath = ?', [filepath]);

      // Insert module data
      for (const module of modules) {
        await (this.db.run as any)(
          `INSERT INTO modules (name, filepath, line, port_count, register_count) 
           VALUES (?, ?, ?, ?, ?)`,
          [module.name, filepath, module.line, module.ports.length, module.registers.length]
        );

        // Insert register data
        for (const register of module.registers) {
          await (this.db.run as any)(
            `INSERT INTO registers (name, module_name, filepath, type, width, clock, reset, line) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              register.name,
              module.name,
              filepath,
              register.type,
              register.width,
              register.clock || null,
              register.reset || null,
              register.line
            ]
          );
        }
      }

      await (this.db.run as any)('COMMIT');
    } catch (error) {
      await (this.db.run as any)('ROLLBACK');
      logger.error('Error caching parse data:', error);
      throw error;
    }
  }

  async getRegisterStats(scope?: string): Promise<any> {
    let query = `
      SELECT 
        type,
        COUNT(*) as count,
        SUM(width) as total_bits
      FROM registers
    `;
    
    const params: any[] = [];
    if (scope) {
      query += ' WHERE module_name = ?';
      params.push(scope);
    }
    
    query += ' GROUP BY type';
    
    const rows = await (this.db.all as any)(query, params);
    
    const stats = {
      flip_flop: { count: 0, total_bits: 0 },
      latch: { count: 0, total_bits: 0 },
      total: { count: 0, total_bits: 0 }
    };
    
    for (const row of rows) {
      if (row.type === 'flip_flop') {
        stats.flip_flop.count = row.count;
        stats.flip_flop.total_bits = row.total_bits;
      } else if (row.type === 'latch') {
        stats.latch.count = row.count;
        stats.latch.total_bits = row.total_bits;
      }
      stats.total.count += row.count;
      stats.total.total_bits += row.total_bits;
    }
    
    return stats;
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}