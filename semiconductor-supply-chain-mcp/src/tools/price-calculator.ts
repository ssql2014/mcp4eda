import { z } from 'zod';
import { PriceEstimation } from '../types/index.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

const PriceCalculatorSchema = z.object({
  service: z.string().describe('Service type (e.g., asic_nre, ip_licensing, mask_set)'),
  parameters: z.object({
    technology: z.string().optional().describe('Technology node'),
    dieSize: z.number().optional().describe('Die size in mm²'),
    complexity: z.enum(['low', 'medium', 'high']).optional(),
    volume: z.number().optional().describe('Production volume'),
    layers: z.number().optional().describe('Number of metal layers'),
  }).describe('Service-specific parameters'),
});

type PriceCalculatorArgs = z.infer<typeof PriceCalculatorSchema>;

export const priceCalculatorTool = {
  definition: {
    name: 'get_price_estimation',
    description: 'Get price estimation for semiconductor services',
    inputSchema: zodToJsonSchema(PriceCalculatorSchema) as any,
  },
  
  handler: async (args: unknown) => {
    const parsed = PriceCalculatorSchema.parse(args);
    
    // Mock price calculation logic
    let estimation: PriceEstimation = {
      service: parsed.service,
      parameters: parsed.parameters,
    };
    
    switch (parsed.service) {
      case 'asic_nre':
        const complexity = parsed.parameters.complexity || 'medium';
        const techNode = parsed.parameters.technology || '28nm';
        const basePrice = techNode === '7nm' ? 5000000 : 
                         techNode === '14nm' ? 2000000 : 
                         1000000;
        const complexityMultiplier = complexity === 'high' ? 2.5 : 
                                    complexity === 'medium' ? 1.5 : 1;
        
        estimation.estimatedCost = {
          min: basePrice * complexityMultiplier * 0.8,
          max: basePrice * complexityMultiplier * 1.2,
          currency: 'USD',
        };
        
        estimation.breakdown = {
          'Design': basePrice * 0.3,
          'Verification': basePrice * 0.25,
          'Physical Design': basePrice * 0.2,
          'Mask Set': basePrice * 0.15,
          'Prototype': basePrice * 0.1,
        };
        break;
        
      case 'ip_licensing':
        const ipBasePrice = 200000;
        estimation.estimatedCost = {
          min: ipBasePrice,
          max: ipBasePrice * 3,
          currency: 'USD',
        };
        estimation.notes = [
          'Pricing varies based on license type (single use, multi-project, etc.)',
          'Volume discounts may apply',
          'Support and maintenance fees additional',
        ];
        break;
        
      default:
        estimation.notes = ['Price estimation not available for this service'];
    }
    
    return {
      content: [
        {
          type: 'text',
          text: `Price Estimation for ${parsed.service}:\n\n` +
                `Estimated Cost: $${estimation.estimatedCost?.min?.toLocaleString()} - ` +
                `$${estimation.estimatedCost?.max?.toLocaleString()} ${estimation.estimatedCost?.currency}\n\n` +
                (estimation.breakdown ? 
                  `Cost Breakdown:\n${Object.entries(estimation.breakdown)
                    .map(([item, cost]) => `  - ${item}: $${cost.toLocaleString()}`)
                    .join('\n')}\n\n` : '') +
                (estimation.notes ? 
                  `Notes:\n${estimation.notes.map(note => `  - ${note}`).join('\n')}` : ''),
        },
      ],
      data: estimation,
    };
  },
};