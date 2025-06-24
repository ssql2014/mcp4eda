#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Test cases for natural language queries
const testQueries = [
  // IP Core queries
  "Find DDR5 PHY IP vendors for 7nm process",
  "Show me USB 3.0 IP cores", 
  "I need PCIe 5.0 controller IP",
  "List memory interface IPs for 5nm",
  
  // ASIC Service queries
  "Find ASIC design services",
  "Show verification services for 7nm designs",
  "I need backend design services",
  
  // Price estimation queries
  "Estimate ASIC NRE cost for 7nm",
  "What's the mask cost for 5nm?",
  "Calculate IP licensing cost for DDR5 PHY",
  
  // Comparison queries
  "Compare TSMC vs Samsung foundry services",
  "Which is better: Synopsys or Cadence for IP?",
  
  // Complex queries
  "Find DDR5 IP vendors that support 7nm TSMC process with low power options",
  "I'm designing an AI accelerator at 7nm, what services do I need?",
  
  // Ambiguous query to test suggestions
  "I need something for my chip"
];

async function testNaturalLanguageQueries() {
  console.log('🚀 Starting MCP Server Test for Natural Language Queries\n');
  
  // Create transport connected to the server
  const serverPath = new URL('../dist/index.js', import.meta.url).pathname;
  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath]
  });

  const client = new Client({
    name: 'test-nlp-client',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    console.log('✅ Connected to MCP server\n');

    // Test natural language queries
    console.log('📝 Testing Natural Language Queries:\n');
    
    for (const query of testQueries) {
      console.log(`\n🔍 Query: "${query}"`);
      console.log('-'.repeat(60));
      
      try {
        const result = await client.callTool('natural_language_query', {
          query: query
        });
        
        const response = JSON.parse(result.content[0].text);
        
        if (response.query_info) {
          console.log(`✅ Intent: ${response.query_info.understood_intent}`);
          console.log(`📊 Confidence: ${(response.query_info.confidence * 100).toFixed(1)}%`);
          console.log(`🔧 Parameters: ${JSON.stringify(response.query_info.extracted_parameters)}`);
          
          if (response.query_info.suggestions_for_improvement) {
            console.log(`💡 Suggestions:`);
            response.query_info.suggestions_for_improvement.forEach((s: string) => 
              console.log(`   ${s}`)
            );
          }
        }
        
        if (response.status === 'need_clarification') {
          console.log(`⚠️  Need clarification: ${response.message}`);
        } else if (response.result) {
          console.log(`📋 Results: Found ${response.result.vendors?.length || response.result.services?.length || 0} items`);
        }
        
      } catch (error) {
        console.error(`❌ Error: ${error}`);
      }
    }

    // Test resources
    console.log('\n\n📚 Testing Resources:\n');
    
    const resources = await client.listResources();
    console.log(`Found ${resources.resources.length} resources:`);
    resources.resources.forEach((r: any) => {
      console.log(`  - ${r.name}: ${r.uri}`);
    });

    // Read glossary
    console.log('\n📖 Reading Glossary Sample:');
    const glossary = await client.readResource('semiconductor://glossary');
    const glossaryData = JSON.parse(glossary.contents[0].text);
    console.log(`Total terms: ${glossaryData.total_terms}`);
    console.log(`Categories: ${Object.keys(glossaryData.categories).join(', ')}`);

    // Read process nodes
    console.log('\n🏭 Reading Process Nodes:');
    const processNodes = await client.readResource('semiconductor://process-nodes');
    const nodesData = JSON.parse(processNodes.contents[0].text);
    console.log(`Available nodes: ${nodesData.available_nodes.join(', ')}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await client.close();
    console.log('\n✅ Test completed');
    process.exit(0);
  }
}

// Run the test
testNaturalLanguageQueries().catch(console.error);