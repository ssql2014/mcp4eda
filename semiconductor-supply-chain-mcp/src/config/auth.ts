import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';

export const AuthConfigSchema = z.object({
  designreuse: z.object({
    username: z.string(),
    password: z.string(),
    sessionCookies: z.array(z.object({
      name: z.string(),
      value: z.string(),
      domain: z.string(),
      path: z.string(),
      expires: z.number().optional(),
    })).optional(),
  }).optional(),
  anysilicon: z.object({
    apiKey: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
  }).optional(),
});

export type AuthConfig = z.infer<typeof AuthConfigSchema>;

export class AuthManager {
  private config: AuthConfig = {};
  private configPath: string;
  private sessionCache: Map<string, any> = new Map();

  constructor() {
    // Store auth config in user's home directory
    this.configPath = path.join(homedir(), '.semiconductor-mcp', 'auth.json');
    this.loadFromEnvironment();
  }

  private loadFromEnvironment(): void {
    // Load credentials from environment variables
    const envConfig: AuthConfig = {};
    
    if (process.env.DESIGNREUSE_USERNAME && process.env.DESIGNREUSE_PASSWORD) {
      envConfig.designreuse = {
        username: process.env.DESIGNREUSE_USERNAME,
        password: process.env.DESIGNREUSE_PASSWORD,
      };
    }
    
    if (process.env.ANYSILICON_API_KEY) {
      envConfig.anysilicon = {
        apiKey: process.env.ANYSILICON_API_KEY,
      };
    }
    
    // Environment variables take precedence
    this.config = { ...this.config, ...envConfig };
  }

  async loadConfig(): Promise<void> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      this.config = AuthConfigSchema.parse(JSON.parse(configData));
    } catch (error) {
      console.error('No auth config found or invalid config');
      this.config = {};
    }
  }

  async saveConfig(config: AuthConfig): Promise<void> {
    const dir = path.dirname(this.configPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
    this.config = config;
  }

  getCredentials(site: keyof AuthConfig): AuthConfig[typeof site] | undefined {
    return this.config[site];
  }

  async updateSession(site: string, sessionData: any): Promise<void> {
    this.sessionCache.set(site, sessionData);
    
    // Optionally persist session cookies
    if (site === 'designreuse' && sessionData.cookies) {
      const currentConfig = { ...this.config };
      if (currentConfig.designreuse) {
        currentConfig.designreuse.sessionCookies = sessionData.cookies;
        await this.saveConfig(currentConfig);
      }
    }
  }

  getSession(site: string): any {
    return this.sessionCache.get(site);
  }

  isAuthenticated(site: string): boolean {
    const session = this.sessionCache.get(site);
    if (!session) return false;
    
    // Check if session is still valid
    if (session.expiresAt && Date.now() > session.expiresAt) {
      this.sessionCache.delete(site);
      return false;
    }
    
    return true;
  }
}