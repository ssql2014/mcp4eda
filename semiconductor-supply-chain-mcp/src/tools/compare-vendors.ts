import { z } from 'zod';
import { VendorComparison } from '../types/index.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

const CompareVendorsSchema = z.object({
  vendorNames: z.array(z.string()).describe('List of vendor names to compare'),
  criteria: z.array(z.string()).optional().default(['technology', 'price', 'support', 'delivery'])
    .describe('Comparison criteria'),
  category: z.string().optional().describe('Category for comparison context'),
});

type CompareVendorsArgs = z.infer<typeof CompareVendorsSchema>;

export const compareVendorsTool = {
  definition: {
    name: 'compare_vendors',
    description: 'Compare multiple IP vendors or ASIC service providers',
    inputSchema: zodToJsonSchema(CompareVendorsSchema) as any,
  },
  
  handler: async (args: unknown) => {
    const parsed = CompareVendorsSchema.parse(args);
    
    // Validate vendor names
    if (!parsed.vendorNames || parsed.vendorNames.length < 2) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Please provide at least 2 vendor names to compare',
              example: 'vendorNames: ["Synopsys", "Cadence"]'
            }, null, 2),
          },
        ],
      };
    }
    
    // Ensure criteria has default values if not provided
    const criteria = parsed.criteria || ['technology', 'price', 'support', 'delivery'];
    
    // TODO: Implement actual vendor data retrieval and comparison
    // For now, create mock comparison data
    const mockComparison: VendorComparison = {
      vendors: parsed.vendorNames.map(name => ({
        name: `${name} DDR5 PHY`,
        company: name,
        category: parsed.category || 'PHY',
        subcategory: 'DDR5',
        description: `${name}'s DDR5 PHY solution`,
      })),
      criteria: criteria,
      comparison: {},
      recommendation: '',
    };
    
    // Create comparison matrix
    parsed.vendorNames.forEach(vendor => {
      mockComparison.comparison[vendor] = {};
      criteria.forEach(criterion => {
        switch (criterion) {
          case 'technology':
            mockComparison.comparison[vendor][criterion] = {
              nodes: ['7nm', '5nm'],
              maturity: 'Production',
            };
            break;
          case 'price':
            mockComparison.comparison[vendor][criterion] = {
              licensing: '$200K-$500K',
              royalty: 'Negotiable',
            };
            break;
          case 'support':
            mockComparison.comparison[vendor][criterion] = {
              level: '24/7',
              training: 'Included',
            };
            break;
          case 'delivery':
            mockComparison.comparison[vendor][criterion] = {
              leadTime: '8-12 weeks',
              format: 'Soft IP',
            };
            break;
        }
      });
    });
    
    // Generate recommendation
    mockComparison.recommendation = `Based on the comparison, ${parsed.vendorNames[0]} offers ` +
      `the most comprehensive solution with better technology node support and competitive pricing.`;
    
    // Format comparison table
    let comparisonText = `Vendor Comparison:\n\n`;
    comparisonText += `Vendors: ${parsed.vendorNames.join(', ')}\n\n`;
    
    criteria.forEach(criterion => {
      comparisonText += `${criterion.toUpperCase()}:\n`;
      parsed.vendorNames.forEach(vendor => {
        comparisonText += `  ${vendor}:\n`;
        const data = mockComparison.comparison[vendor][criterion];
        Object.entries(data).forEach(([key, value]) => {
          comparisonText += `    - ${key}: ${value}\n`;
        });
      });
      comparisonText += '\n';
    });
    
    comparisonText += `\nRecommendation: ${mockComparison.recommendation}`;
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            comparison_summary: comparisonText,
            detailed_comparison: mockComparison
          }, null, 2),
        },
      ],
    };
  },
};