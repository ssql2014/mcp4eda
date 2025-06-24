import { 
  ListResourcesRequestSchema, 
  ReadResourceRequestSchema,
  Resource 
} from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { 
  semiconductorGlossary, 
  searchGlossary,
  categoryDescriptions 
} from './semiconductor-glossary.js';
import { 
  industryKnowledgeBase,
  processNodeDatabase,
  getVendorsByCategory,
  getProcessNodeInfo 
} from './industry-knowledge.js';

export function setupResources(server: Server) {
  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources: Resource[] = [
      {
        uri: 'semiconductor://glossary',
        name: 'Semiconductor Glossary',
        description: 'Comprehensive glossary of semiconductor industry terms and definitions',
        mimeType: 'application/json'
      },
      {
        uri: 'semiconductor://glossary/search',
        name: 'Glossary Search',
        description: 'Search semiconductor terms by keyword',
        mimeType: 'application/json'
      },
      {
        uri: 'semiconductor://industry-knowledge',
        name: 'Industry Knowledge Base',
        description: 'Vendor information, applications, and key considerations by category',
        mimeType: 'application/json'
      },
      {
        uri: 'semiconductor://process-nodes',
        name: 'Process Node Database',
        description: 'Detailed information about semiconductor process nodes',
        mimeType: 'application/json'
      },
      {
        uri: 'semiconductor://vendors',
        name: 'Vendor Directory',
        description: 'Comprehensive list of semiconductor vendors by category',
        mimeType: 'application/json'
      }
    ];

    return { resources };
  });

  // Read specific resources
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    
    switch (uri) {
      case 'semiconductor://glossary':
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                terms: semiconductorGlossary,
                categories: categoryDescriptions,
                total_terms: semiconductorGlossary.length
              }, null, 2)
            }
          ]
        };

      case 'semiconductor://glossary/search':
        // Extract search term from query parameters
        const searchMatch = uri.match(/search\?term=(.+)$/);
        const searchTerm = searchMatch ? decodeURIComponent(searchMatch[1]) : '';
        
        const searchResults = searchTerm ? searchGlossary(searchTerm) : [];
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                search_term: searchTerm,
                results: searchResults,
                count: searchResults.length
              }, null, 2)
            }
          ]
        };

      case 'semiconductor://industry-knowledge':
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                knowledge_base: industryKnowledgeBase,
                categories: [...new Set(industryKnowledgeBase.map(k => k.category))],
                total_entries: industryKnowledgeBase.length
              }, null, 2)
            }
          ]
        };

      case 'semiconductor://process-nodes':
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                process_nodes: processNodeDatabase,
                available_nodes: processNodeDatabase.map(p => p.node),
                foundries: [...new Set(processNodeDatabase.flatMap(p => p.foundries))]
              }, null, 2)
            }
          ]
        };

      case 'semiconductor://vendors':
        const vendorsByCategory: Record<string, string[]> = {};
        const categories = [...new Set(industryKnowledgeBase.map(k => k.category))];
        
        categories.forEach(category => {
          vendorsByCategory[category] = getVendorsByCategory(category);
        });

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                vendors_by_category: vendorsByCategory,
                all_vendors: [...new Set(industryKnowledgeBase.flatMap(k => k.commonVendors))].sort(),
                total_vendors: new Set(industryKnowledgeBase.flatMap(k => k.commonVendors)).size
              }, null, 2)
            }
          ]
        };

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  });
}