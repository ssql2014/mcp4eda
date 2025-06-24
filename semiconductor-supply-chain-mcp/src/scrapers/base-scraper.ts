import puppeteer, { Browser, Page, Cookie } from 'puppeteer';
import { AuthManager } from '../config/auth.js';
import NodeCache from 'node-cache';

export interface ScraperOptions {
  headless?: boolean;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  userAgent?: string;
}

export abstract class BaseScraper {
  protected browser: Browser | null = null;
  protected page: Page | null = null;
  protected authManager: AuthManager;
  protected cache: NodeCache;
  protected options: ScraperOptions;

  constructor(authManager: AuthManager, options: ScraperOptions = {}) {
    this.authManager = authManager;
    this.options = {
      headless: true,
      cacheEnabled: true,
      cacheTTL: 900, // 15 minutes default
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      ...options,
    };
    
    this.cache = new NodeCache({ 
      stdTTL: this.options.cacheTTL!,
      checkperiod: 600 
    });
  }

  abstract get siteName(): string;
  abstract get baseUrl(): string;
  abstract login(): Promise<boolean>;

  async init(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: this.options.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    this.page = await this.browser.newPage();
    
    if (this.options.userAgent) {
      await this.page.setUserAgent(this.options.userAgent);
    }

    // Load saved session if available
    await this.loadSession();
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  protected async loadSession(): Promise<void> {
    const credentials = this.authManager.getCredentials(this.siteName as any);
    if (credentials && 'sessionCookies' in credentials && credentials.sessionCookies) {
      await this.page!.setCookie(...credentials.sessionCookies as Cookie[]);
    }
  }

  protected async saveSession(): Promise<void> {
    if (!this.page) return;
    
    const cookies = await this.page.cookies();
    await this.authManager.updateSession(this.siteName, { 
      cookies,
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    });
  }

  protected async ensureAuthenticated(): Promise<boolean> {
    if (this.authManager.isAuthenticated(this.siteName)) {
      return true;
    }

    const loginSuccess = await this.login();
    if (loginSuccess) {
      await this.saveSession();
    }
    
    return loginSuccess;
  }

  protected getCacheKey(method: string, params: any): string {
    return `${this.siteName}:${method}:${JSON.stringify(params)}`;
  }

  protected async withCache<T>(
    key: string, 
    fetchFn: () => Promise<T>
  ): Promise<T> {
    if (this.options.cacheEnabled) {
      const cached = this.cache.get<T>(key);
      if (cached !== undefined) {
        console.log(`Cache hit for ${key}`);
        return cached;
      }
    }

    const result = await fetchFn();
    
    if (this.options.cacheEnabled && result !== null) {
      this.cache.set(key, result);
    }
    
    return result;
  }

  protected async navigateWithRetry(
    url: string, 
    maxRetries: number = 3
  ): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.page!.goto(url, { 
          waitUntil: 'networkidle2',
          timeout: 30000 
        });
        return true;
      } catch (error) {
        console.error(`Navigation attempt ${i + 1} failed:`, error);
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    return false;
  }

  protected async waitAndClick(selector: string, timeout: number = 5000): Promise<void> {
    await this.page!.waitForSelector(selector, { timeout });
    await this.page!.click(selector);
  }

  protected async waitAndType(
    selector: string, 
    text: string, 
    timeout: number = 5000
  ): Promise<void> {
    await this.page!.waitForSelector(selector, { timeout });
    await this.page!.type(selector, text);
  }
}