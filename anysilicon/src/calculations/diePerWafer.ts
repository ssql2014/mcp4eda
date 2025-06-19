import { validateDiePerWaferParams, normalizeParams } from '../utils/validation.js';
import { ValidationError } from '../errors/index.js';
import { AnySiliconScraper } from '../scrapers/anysilicon-fixed.js';
import type { DiePerWaferParams, DiePerWaferResult } from './types.js';

let scraper: AnySiliconScraper | null = null;

async function ensureScraperInitialized(): Promise<AnySiliconScraper> {
  if (!scraper) {
    scraper = new AnySiliconScraper();
    await scraper.initialize();
  }
  return scraper;
}

export async function calculateDiePerWafer(params: DiePerWaferParams): Promise<DiePerWaferResult> {
  try {
    // Validate parameters
    const validation = validateDiePerWaferParams(params);
    if (!validation.valid) {
      throw new ValidationError('Invalid parameters', { errors: validation.errors });
    }

    // Normalize parameters with defaults
    const normalizedParams = normalizeParams(params);
    const { wafer_diameter, die_width, die_height, scribe_lane, edge_exclusion } = normalizedParams;

    // Add safety check for die dimensions
    if (die_width >= wafer_diameter || die_height >= wafer_diameter) {
      throw new ValidationError('Die dimensions exceed wafer diameter');
    }

    // Initialize scraper if needed
    const activeScraper = await ensureScraperInitialized();

    // Prepare parameters for AnySilicon calculator
    const scraperParams = {
      waferDiameter: wafer_diameter,
      dieWidth: die_width,
      dieHeight: die_height,
      edgeExclusion: edge_exclusion,
      scribeWidth: scribe_lane
    };

    // Get results from AnySilicon calculator webpage
    const scraperResult = await activeScraper.calculateDiePerWafer(scraperParams);

    // Convert scraper results to our format
    const waferArea = Math.PI * Math.pow(wafer_diameter / 2, 2);
    const dieArea = die_width * die_height;
    const utilizedArea = scraperResult.netDieCount * dieArea;
    const utilizationPercentage = (utilizedArea / waferArea) * 100;
    
    // Calculate effective wafer area after edge exclusion
    const effectiveDiameter = wafer_diameter - 2 * edge_exclusion;
    const effectiveWaferArea = Math.PI * Math.pow(effectiveDiameter / 2, 2);
    const placementEfficiency = (utilizedArea / effectiveWaferArea) * 100;

    return {
      total_dies: scraperResult.netDieCount,
      wafer_area: waferArea,
      utilized_area: utilizedArea,
      utilization_percentage: parseFloat(utilizationPercentage.toFixed(2)),
      calculation_details: {
        effective_diameter: effectiveDiameter,
        die_area: dieArea,
        dies_per_row: [], // Not provided by AnySilicon calculator
        placement_efficiency: parseFloat(placementEfficiency.toFixed(2)),
        gross_die_count: scraperResult.grossDieCount,
        edge_die_loss: scraperResult.edgeDieLoss
      },
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError('Calculation error', { 
      originalError: error instanceof Error ? error.message : String(error),
      hint: 'Failed to get results from AnySilicon calculator. Please check your internet connection and try again.'
    });
  }
}

// Cleanup function to close browser when done
export async function cleanup(): Promise<void> {
  if (scraper) {
    await scraper.cleanup();
    scraper = null;
  }
}