#!/usr/bin/env tsx
/**
 * Quick test to verify MCP server is working
 */

import { spawn } from 'child_process';

async function quickTest() {
  console.log('🧪 Quick MCP Server Test\n');

  const proc = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'inherit']
  });

  // Send a list tools request
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: '1',
    method: 'tools/list',
    params: {}
  };

  proc.stdin.write(JSON.stringify(listToolsRequest) + '\n');

  // Read response
  proc.stdout.on('data', (data) => {
    try {
      const response = JSON.parse(data.toString());
      console.log('✅ Server responded:');
      console.log(JSON.stringify(response, null, 2));
      
      // Test a tool call
      const toolCallRequest = {
        jsonrpc: '2.0',
        id: '2',
        method: 'tools/call',
        params: {
          name: 'find_ip_vendors',
          arguments: {
            category: 'PHY',
            subcategory: 'DDR5',
            limit: 2
          }
        }
      };
      
      proc.stdin.write(JSON.stringify(toolCallRequest) + '\n');
      
    } catch (e) {
      // Handle non-JSON output
      console.log('Server output:', data.toString());
    }
  });

  // Give it time to respond
  setTimeout(() => {
    proc.kill();
    console.log('\n✅ Test completed');
  }, 3000);
}

quickTest().catch(console.error);