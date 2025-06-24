import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { QueryParser } from '../nlp/query-parser.js';
import { findIpVendorsTool } from './find-ip-vendors.js';
import { findAsicServicesTool } from './find-asic-services.js';
import { priceCalculatorTool } from './price-calculator.js';
import { compareVendorsTool } from './compare-vendors.js';

const NaturalLanguageQuerySchema = z.object({
  query: z.string().describe('Natural language query about semiconductor supply chain'),
  context: z.object({
    previousQuery: z.string().optional(),
    userPreferences: z.record(z.any()).optional()
  }).optional()
});

export const naturalLanguageQueryTool = {
  definition: {
    name: 'natural_language_query',
    description: 'Process natural language queries about semiconductor supply chain',
    inputSchema: zodToJsonSchema(NaturalLanguageQuerySchema) as any
  },
  
  handler: async (args: unknown) => {
    const parsed = NaturalLanguageQuerySchema.parse(args);
    const parser = new QueryParser();
    
    try {
      // Parse the natural language query
      const parsedQuery = parser.parseQuery(parsed.query);
      
      // If intent is unknown, return suggestions
      if (parsedQuery.intent.type === 'unknown' || parsedQuery.intent.confidence < 0.3) {
        const suggestions = parser.generateSuggestions(parsedQuery.intent);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'need_clarification',
                original_query: parsed.query,
                suggestions: suggestions,
                message: 'Could not understand the query. Please try rephrasing or use one of the suggested formats.'
              }, null, 2)
            }
          ]
        };
      }
      
      // Execute the appropriate tool based on parsed intent
      let result;
      switch (parsedQuery.toolName) {
        case 'find_ip_vendors':
          result = await findIpVendorsTool.handler(parsedQuery.parameters);
          break;
          
        case 'find_asic_services':
          result = await findAsicServicesTool.handler(parsedQuery.parameters);
          break;
          
        case 'get_price_estimation':
          result = await priceCalculatorTool.handler(parsedQuery.parameters);
          break;
          
        case 'compare_vendors':
          result = await compareVendorsTool.handler(parsedQuery.parameters);
          break;
          
        default:
          throw new Error(`Unknown tool: ${parsedQuery.toolName}`);
      }
      
      // Enhance the result with query context
      const enhancedResult: any = {
        query_info: {
          original_query: parsed.query,
          understood_intent: parsedQuery.intent.type,
          confidence: parsedQuery.intent.confidence,
          extracted_parameters: parsedQuery.parameters
        },
        result: JSON.parse(result.content[0].text)
      };
      
      // Add suggestions if confidence is low
      if (parsedQuery.intent.confidence < 0.7) {
        const suggestions = parser.generateSuggestions(parsedQuery.intent);
        if (suggestions.length > 0) {
          enhancedResult.query_info.suggestions_for_improvement = suggestions;
        }
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(enhancedResult, null, 2)
          }
        ]
      };
      
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Failed to process query',
              message: error instanceof Error ? error.message : 'Unknown error',
              original_query: parsed.query
            }, null, 2)
          }
        ]
      };
    }
  }
};