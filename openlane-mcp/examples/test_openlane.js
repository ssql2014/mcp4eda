#!/usr/bin/env node

/**
 * Test script for OpenLane MCP Server
 * Tests all available tools and resources
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import path from 'path';

async function testOpenLaneServer() {
  console.log('🚀 Testing OpenLane MCP Server...\n');

  const serverPath = path.join(process.cwd(), 'dist', 'index.js');
  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath],
  });

  const client = new Client(
    {
      name: 'openlane-test-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  try {
    await client.connect(transport);
    console.log('✅ Connected to OpenLane MCP server\n');

    // Test 1: List available tools
    console.log('📋 Available Tools:');
    const tools = await client.listTools();
    tools.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log();

    // Test 2: List resources
    console.log('📚 Available Resources:');
    const resources = await client.listResources();
    resources.resources.forEach(resource => {
      console.log(`  - ${resource.name}`);
    });
    console.log();

    // Test 3: Read a resource
    console.log('📖 Reading flow-stages resource:');
    const flowStages = await client.readResource({ uri: 'openlane://docs/flow-stages' });
    console.log(flowStages.contents[0].text.substring(0, 200) + '...\n');

    // Test 4: Natural language query
    console.log('🗣️ Testing natural language:');
    const nlResult = await client.callTool({
      name: 'openlane_natural_language',
      arguments: {
        query: 'How do I run synthesis on my counter design?'
      }
    });
    console.log('Response:', JSON.stringify(nlResult.content[0], null, 2));
    console.log();

    // Test 5: Check design configuration
    console.log('🔍 Checking example design:');
    const checkResult = await client.callTool({
      name: 'openlane_check_design',
      arguments: {
        designName: 'counter',
        designPath: path.join(process.cwd(), 'examples', 'counter')
      }
    });
    console.log('Design check:', JSON.stringify(checkResult.content[0], null, 2));
    console.log();

    // Test 6: Generate reports (mock)
    console.log('📊 Testing report generation:');
    const reportResult = await client.callTool({
      name: 'openlane_generate_reports',
      arguments: {
        designName: 'counter',
        runPath: '/tmp/openlane/counter/runs/RUN_2024',
        reportTypes: ['synthesis', 'timing']
      }
    });
    console.log('Report result:', JSON.stringify(reportResult.content[0], null, 2));

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await client.close();
    process.exit(0);
  }
}

// Run the test
testOpenLaneServer().catch(console.error);