import { AuthManager } from '../config/auth.js';

/**
 * Alternative to web scraping: Use official APIs when available
 */
export class ApiClient {
  private authManager: AuthManager;
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(authManager: AuthManager, baseUrl: string) {
    this.authManager = authManager;
    this.baseUrl = baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Semiconductor-Supply-Chain-MCP/1.0',
    };
  }

  /**
   * Make authenticated API request
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.headers,
        ...(options.headers as Record<string, string>),
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Example: AnySilicon API client (if they provide API)
   */
  static createAnySiliconClient(authManager: AuthManager): ApiClient {
    const client = new ApiClient(authManager, 'https://api.anysilicon.com/v1');
    
    const auth = authManager.getCredentials('anysilicon');
    if (auth && 'apiKey' in auth && auth.apiKey) {
      client.headers['X-API-Key'] = auth.apiKey;
    }
    
    return client;
  }
}

/**
 * Hybrid approach: Try API first, fall back to scraping
 */
export class HybridDataSource {
  private apiClient?: ApiClient;
  private scraper: any;

  constructor(apiClient?: ApiClient, scraper?: any) {
    this.apiClient = apiClient;
    this.scraper = scraper;
  }

  async getData<T>(
    apiEndpoint: string,
    scraperMethod: () => Promise<T>
  ): Promise<T> {
    // Try API first if available
    if (this.apiClient) {
      try {
        return await this.apiClient.request<T>(apiEndpoint);
      } catch (error) {
        console.log('API request failed, falling back to scraping:', error);
      }
    }

    // Fall back to scraping
    if (this.scraper) {
      return await scraperMethod();
    }

    throw new Error('No data source available');
  }
}