import { Page } from 'puppeteer';

/**
 * Handles authentication flows that require user interaction
 * like CAPTCHA, 2FA, or complex login flows
 */
export class AuthProxy {
  private page: Page;
  private siteName: string;

  constructor(page: Page, siteName: string) {
    this.page = page;
    this.siteName = siteName;
  }

  /**
   * Wait for manual authentication with timeout
   */
  async waitForManualAuth(
    successIndicator: string,
    timeoutMs: number = 300000 // 5 minutes
  ): Promise<boolean> {
    console.log(`\n=== Manual Authentication Required for ${this.siteName} ===`);
    console.log('Please complete the login process in the browser window.');
    console.log('The script will continue once login is detected.\n');

    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        // Check if success indicator is present
        const element = await this.page.$(successIndicator);
        if (element) {
          console.log('Login successful! Continuing...');
          return true;
        }
      } catch (error) {
        // Page might be navigating, ignore errors
      }
      
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('Manual authentication timeout exceeded.');
    return false;
  }

  /**
   * Handle OAuth flow
   */
  async handleOAuth(
    oauthButtonSelector: string,
    successUrl: string
  ): Promise<boolean> {
    try {
      // Click OAuth button
      await this.page.click(oauthButtonSelector);
      
      // Wait for OAuth redirect
      await this.page.waitForNavigation();
      
      // Check if we're on the success URL
      const currentUrl = this.page.url();
      return currentUrl.includes(successUrl);
      
    } catch (error) {
      console.error('OAuth flow failed:', error);
      return false;
    }
  }

  /**
   * Alternative: Use browser profile with saved sessions
   */
  static getBrowserProfilePath(siteName: string): string {
    const { homedir } = require('os');
    const path = require('path');
    return path.join(homedir(), '.semiconductor-mcp', 'browser-profiles', siteName);
  }
}