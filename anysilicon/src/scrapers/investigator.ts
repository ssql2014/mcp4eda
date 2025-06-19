import puppeteer, { Browser, Page } from 'puppeteer';

export class AnySiliconInvestigator {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: false, // Run in headed mode to see what's happening
      devtools: true, // Open DevTools automatically
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    
    // Enable request interception to monitor network traffic
    await this.page.setRequestInterception(true);
    
    // Log all network requests
    this.page.on('request', (request) => {
      if (request.method() === 'POST' || request.url().includes('api') || request.url().includes('calculate')) {
        console.log('REQUEST:', {
          url: request.url(),
          method: request.method(),
          postData: request.postData(),
          headers: request.headers()
        });
      }
      request.continue();
    });
    
    // Log all network responses
    this.page.on('response', async (response) => {
      if (response.url().includes('api') || response.url().includes('calculate')) {
        try {
          const body = await response.text();
          console.log('RESPONSE:', {
            url: response.url(),
            status: response.status(),
            body: body.substring(0, 500) // First 500 chars
          });
        } catch (e) {
          // Ignore errors for non-text responses
        }
      }
    });
    
    // Log console messages from the page
    this.page.on('console', (msg) => {
      if (msg.type() === 'log' || msg.type() === 'info') {
        console.log('PAGE CONSOLE:', msg.text());
      }
    });
  }

  async investigate(): Promise<void> {
    if (!this.page) {
      throw new Error('Investigator not initialized');
    }

    console.log('Navigating to AnySilicon calculator...');
    await this.page.goto('https://anysilicon.com/die-per-wafer-formula-free-calculators/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait a bit for any dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Investigate the page structure
    console.log('\n=== INVESTIGATING PAGE STRUCTURE ===\n');

    // Look for input fields
    const inputs = await this.page.evaluate(() => {
      const allInputs = Array.from(document.querySelectorAll('input'));
      return allInputs.map(input => ({
        type: input.type,
        name: input.name,
        id: input.id,
        placeholder: input.placeholder,
        value: input.value,
        className: input.className
      }));
    });
    console.log('INPUT FIELDS FOUND:', JSON.stringify(inputs, null, 2));

    // Look for buttons
    const buttons = await this.page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]'));
      return allButtons.map(button => ({
        tagName: button.tagName,
        type: (button as HTMLInputElement).type || '',
        text: button.textContent?.trim() || '',
        value: (button as HTMLInputElement).value || '',
        onclick: (button as HTMLElement).onclick ? 'has onclick' : 'no onclick',
        id: button.id,
        className: button.className
      }));
    });
    console.log('\nBUTTONS FOUND:', JSON.stringify(buttons, null, 2));

    // Look for forms
    const forms = await this.page.evaluate(() => {
      const allForms = Array.from(document.querySelectorAll('form'));
      return allForms.map(form => ({
        action: form.action,
        method: form.method,
        id: form.id,
        className: form.className
      }));
    });
    console.log('\nFORMS FOUND:', JSON.stringify(forms, null, 2));

    // Look for result containers
    const resultContainers = await this.page.evaluate(() => {
      const possibleResults = Array.from(document.querySelectorAll('[id*="result"], [class*="result"], [id*="die"], [class*="die"], [id*="output"], [class*="output"]'));
      return possibleResults.map(elem => ({
        tagName: elem.tagName,
        id: elem.id,
        className: elem.className,
        text: elem.textContent?.trim().substring(0, 50) || ''
      }));
    });
    console.log('\nPOSSIBLE RESULT CONTAINERS:', JSON.stringify(resultContainers, null, 2));

    // Check for iframes
    const iframes = await this.page.evaluate(() => {
      return Array.from(document.querySelectorAll('iframe')).map(iframe => ({
        src: iframe.src,
        id: iframe.id,
        className: iframe.className
      }));
    });
    console.log('\nIFRAMES:', JSON.stringify(iframes, null, 2));

    // Check for calculator-specific elements
    console.log('\n=== LOOKING FOR CALCULATOR ELEMENTS ===\n');
    
    // Try to find elements by common calculator patterns
    const calculatorElements = await this.page.evaluate(() => {
      const patterns = ['wafer', 'die', 'width', 'height', 'diameter', 'calculate', 'result', 'total', 'gross', 'net'];
      const elements: any[] = [];
      
      patterns.forEach(pattern => {
        // Search by ID
        document.querySelectorAll(`[id*="${pattern}" i]`).forEach(elem => {
          elements.push({
            selector: `id contains '${pattern}'`,
            tagName: elem.tagName,
            id: elem.id,
            text: elem.textContent?.trim().substring(0, 50) || ''
          });
        });
        
        // Search by placeholder
        document.querySelectorAll(`[placeholder*="${pattern}" i]`).forEach(elem => {
          elements.push({
            selector: `placeholder contains '${pattern}'`,
            tagName: elem.tagName,
            placeholder: (elem as HTMLInputElement).placeholder,
            id: elem.id
          });
        });
        
        // Search by label
        document.querySelectorAll(`label`).forEach(label => {
          if (label.textContent?.toLowerCase().includes(pattern)) {
            elements.push({
              selector: `label contains '${pattern}'`,
              labelText: label.textContent.trim(),
              forAttr: label.getAttribute('for')
            });
          }
        });
      });
      
      return elements;
    });
    console.log('CALCULATOR-SPECIFIC ELEMENTS:', JSON.stringify(calculatorElements, null, 2));

    // Take a screenshot
    await this.page.screenshot({ path: 'anysilicon-page-investigation.png', fullPage: true });
    console.log('\nScreenshot saved as: anysilicon-page-investigation.png');

    console.log('\n=== TESTING CALCULATION ===\n');
    
    // Try to perform a calculation and monitor network traffic
    console.log('Attempting to fill form and trigger calculation...');
    
    // This part would need to be adjusted based on the investigation results
    // For now, we'll wait for manual interaction
    console.log('Please manually fill the form and click calculate in the browser window.');
    console.log('Watch the console for any API calls or network activity.');
    console.log('Press Ctrl+C when done.');
    
    // Keep the browser open for manual investigation
    await new Promise(() => {}); // Wait indefinitely
  }

  async cleanup(): Promise<void> {
    if (this.page) {
      await this.page.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Run the investigation
async function main() {
  const investigator = new AnySiliconInvestigator();
  try {
    await investigator.initialize();
    await investigator.investigate();
  } catch (error) {
    console.error('Investigation error:', error);
  } finally {
    await investigator.cleanup();
  }
}

if (require.main === module) {
  main();
}