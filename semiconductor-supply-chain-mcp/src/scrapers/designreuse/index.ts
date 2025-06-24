import { BaseScraper } from '../base-scraper.js';
import { IpVendor } from '../../types/index.js';

export class DesignReuseScraper extends BaseScraper {
  get siteName(): string {
    return 'designreuse';
  }

  get baseUrl(): string {
    return 'https://www.design-reuse.com';
  }

  async login(): Promise<boolean> {
    const credentials = this.authManager.getCredentials('designreuse');
    if (!credentials || !credentials.username || !credentials.password) {
      console.error('DesignReuse credentials not configured');
      return false;
    }

    try {
      // Navigate to login page
      await this.navigateWithRetry(`${this.baseUrl}/login/`);
      
      // Fill login form
      await this.waitAndType('#username', credentials.username);
      await this.waitAndType('#password', credentials.password);
      
      // Click login button
      await this.waitAndClick('button[type="submit"]');
      
      // Wait for redirect and check if login successful
      await this.page!.waitForNavigation();
      
      // Check for login success indicators
      const loggedIn = await this.page!.$('.user-menu') !== null;
      
      if (loggedIn) {
        console.log('Successfully logged in to DesignReuse');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('DesignReuse login failed:', error);
      return false;
    }
  }

  async searchIpCores(params: {
    category: string;
    keywords?: string[];
    technology?: string;
  }): Promise<IpVendor[]> {
    const cacheKey = this.getCacheKey('searchIpCores', params);
    
    return this.withCache(cacheKey, async () => {
      // Ensure we're authenticated
      if (!await this.ensureAuthenticated()) {
        throw new Error('Authentication required for DesignReuse');
      }

      const results: IpVendor[] = [];
      
      try {
        // Build search URL
        const searchParams = new URLSearchParams();
        searchParams.append('category', params.category);
        if (params.keywords) {
          searchParams.append('keywords', params.keywords.join(' '));
        }
        if (params.technology) {
          searchParams.append('tech', params.technology);
        }
        
        const searchUrl = `${this.baseUrl}/ip-catalog/?${searchParams.toString()}`;
        await this.navigateWithRetry(searchUrl);
        
        // Wait for results to load
        await this.page!.waitForSelector('.ip-listing', { timeout: 10000 });
        
        // Extract IP core listings
        const listings = await this.page!.$$eval('.ip-listing', elements => 
          elements.map(el => ({
            name: el.querySelector('.ip-title')?.textContent?.trim() || '',
            company: el.querySelector('.vendor-name')?.textContent?.trim() || '',
            description: el.querySelector('.ip-description')?.textContent?.trim() || '',
            category: el.querySelector('.ip-category')?.textContent?.trim() || '',
            features: Array.from(el.querySelectorAll('.feature-tag'))
              .map((tag: any) => tag.textContent?.trim() || ''),
            link: el.querySelector('a')?.getAttribute('href') || '',
          }))
        );
        
        // Convert to IpVendor format
        for (const listing of listings) {
          results.push({
            name: listing.name,
            company: listing.company,
            category: params.category,
            subcategory: listing.category,
            description: listing.description,
            features: listing.features,
            website: listing.link ? `${this.baseUrl}${listing.link}` : undefined,
          });
        }
        
      } catch (error) {
        console.error('Error searching DesignReuse:', error);
        throw error;
      }
      
      return results;
    });
  }

  async getIpDetails(ipUrl: string): Promise<IpVendor | null> {
    const cacheKey = this.getCacheKey('getIpDetails', { url: ipUrl });
    
    return this.withCache(cacheKey, async () => {
      if (!await this.ensureAuthenticated()) {
        throw new Error('Authentication required for DesignReuse');
      }

      try {
        await this.navigateWithRetry(ipUrl);
        
        // Extract detailed information
        const details = await this.page!.evaluate(() => {
          const getTextContent = (selector: string) => {
            const elem = document.querySelector(selector);
            return elem?.textContent?.trim() || '';
          };
          
          return {
            name: getTextContent('h1.ip-title'),
            company: getTextContent('.vendor-info .name'),
            description: getTextContent('.ip-full-description'),
            category: getTextContent('.breadcrumb .active'),
            processNodes: Array.from(document.querySelectorAll('.tech-node'))
              .map((el: any) => el.textContent?.trim() || ''),
            features: Array.from(document.querySelectorAll('.feature-list li'))
              .map((el: any) => el.textContent?.trim() || ''),
            contact: getTextContent('.contact-info'),
          };
        });
        
        return {
          ...details,
          subcategory: details.category,
          website: ipUrl,
        };
        
      } catch (error) {
        console.error('Error getting IP details:', error);
        return null;
      }
    });
  }
}