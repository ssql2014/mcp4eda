import puppeteer, { Browser, Page } from 'puppeteer';

interface ScraperParams {
  waferDiameter: number;
  dieWidth: number;
  dieHeight: number;
  edgeExclusion?: number;
  scribeWidth?: number;
}

interface ScraperResult {
  grossDieCount: number;
  edgeDieLoss: number;
  netDieCount: number;
  utilization: number;
  dieArea: number;
  waferArea: number;
}

export class AnySiliconScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
  }

  async cleanup(): Promise<void> {
    if (this.page) {
      await this.page.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }

  async calculateDiePerWafer(params: ScraperParams): Promise<ScraperResult> {
    if (!this.page) {
      throw new Error('Scraper not initialized');
    }

    try {
      // Navigate to the calculator page
      await this.page.goto('https://anysilicon.com/die-per-wafer-formula-free-calculators/', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for the form to load
      await this.page.waitForSelector('#die_per_wafer_form', { timeout: 10000 });

      // Select wafer size based on diameter
      const waferSizeValue = params.waferDiameter === 300 ? '12' : '8'; // 12" = 300mm, 8" = 200mm
      await this.page.select('#wafer_size', waferSizeValue);

      // Fill die width
      await this.page.click('#die_width', { clickCount: 3 });
      await this.page.type('#die_width', params.dieWidth.toString());

      // Fill die height
      await this.page.click('#die_height', { clickCount: 3 });
      await this.page.type('#die_height', params.dieHeight.toString());

      // Fill scribe width (X and Y)
      if (params.scribeWidth !== undefined) {
        // Convert mm to micrometers (the form expects micrometers)
        const scribeInMicrometers = (params.scribeWidth * 1000).toString();
        
        await this.page.click('#width_of_x_scribe_line', { clickCount: 3 });
        await this.page.type('#width_of_x_scribe_line', scribeInMicrometers);
        
        await this.page.click('#width_of_y_scribe_line', { clickCount: 3 });
        await this.page.type('#width_of_y_scribe_line', scribeInMicrometers);
      }

      // Fill edge exclusion
      if (params.edgeExclusion !== undefined) {
        await this.page.click('#wafer_edge_exclusion', { clickCount: 3 });
        await this.page.type('#wafer_edge_exclusion', params.edgeExclusion.toString());
      }

      // Click calculate button
      await this.page.click('#die_per_wafer_form_submit');

      // Wait for results - the form might reload or update via JavaScript
      await this.page.waitForFunction(
        () => {
          const dpwField = document.querySelector('#dpw') as HTMLInputElement;
          return dpwField && dpwField.value && dpwField.value !== '';
        },
        { timeout: 10000 }
      );

      // Extract results
      const dpwValue = await this.page.$eval('#dpw', (el) => (el as HTMLInputElement).value);

      // Parse DPW value (it's the dies per wafer for the selected wafer size)
      const totalDies = parseInt(dpwValue) || 0;
      
      // Calculate derived values
      const waferArea = Math.PI * Math.pow(params.waferDiameter / 2, 2);
      const dieArea = params.dieWidth * params.dieHeight;
      const utilization = totalDies > 0 ? (totalDies * dieArea) / waferArea : 0;

      return {
        grossDieCount: totalDies,
        edgeDieLoss: 0, // Not provided by the calculator
        netDieCount: totalDies,
        utilization: utilization,
        dieArea: dieArea,
        waferArea: waferArea
      };

    } catch (error) {
      console.error('Error scraping AnySilicon calculator:', error);
      throw new Error(`Failed to calculate die per wafer: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}