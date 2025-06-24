#!/usr/bin/env tsx
import { spawn } from 'child_process';
import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

class MCPTestClient {
  private process: any;
  private ws?: WebSocket;
  private responseHandlers: Map<string, (response: JsonRpcResponse) => void> = new Map();

  async start() {
    console.log('Starting MCP server...');
    
    // Start the MCP server
    this.process = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    this.process.stdout.on('data', (data: Buffer) => {
      console.log('[Server stdout]:', data.toString());
    });

    this.process.stderr.on('data', (data: Buffer) => {
      console.log('[Server stderr]:', data.toString());
    });

    // Give server time to start
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async sendRequest(method: string, params?: any): Promise<any> {
    const id = uuidv4();
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.responseHandlers.set(id, (response) => {
        if (response.error) {
          reject(new Error(response.error.message));
        } else {
          resolve(response.result);
        }
      });

      // Send via stdio
      this.process.stdin.write(JSON.stringify(request) + '\n');

      // Set timeout
      setTimeout(() => {
        if (this.responseHandlers.has(id)) {
          this.responseHandlers.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 10000);
    });
  }

  async stop() {
    if (this.process) {
      this.process.kill();
    }
  }
}

async function runTests() {
  const client = new MCPTestClient();
  
  try {
    await client.start();
    
    console.log('\n=== Testing MCP Server Tools ===\n');

    // Test 1: List available tools
    console.log('1. Testing list tools...');
    const tools = await client.sendRequest('tools/list');
    console.log('Available tools:', tools.tools.map((t: any) => t.name));

    // Test 2: Find IP vendors
    console.log('\n2. Testing find_ip_vendors...');
    const ipVendors = await client.sendRequest('tools/call', {
      name: 'find_ip_vendors',
      arguments: {
        category: 'PHY',
        subcategory: 'DDR5',
        processNode: '7nm',
        limit: 5
      }
    });
    console.log('IP Vendors found:', ipVendors.content[0].text);

    // Test 3: Find ASIC services
    console.log('\n3. Testing find_asic_services...');
    const asicServices = await client.sendRequest('tools/call', {
      name: 'find_asic_services',
      arguments: {
        serviceType: 'design',
        technology: '7nm',
        limit: 3
      }
    });
    console.log('ASIC Services found:', asicServices.content[0].text);

    // Test 4: Price estimation
    console.log('\n4. Testing get_price_estimation...');
    const priceEstimate = await client.sendRequest('tools/call', {
      name: 'get_price_estimation',
      arguments: {
        service: 'asic_nre',
        parameters: {
          technology: '7nm',
          complexity: 'high',
          dieSize: 100
        }
      }
    });
    console.log('Price estimate:', priceEstimate.content[0].text);

    // Test 5: Compare vendors
    console.log('\n5. Testing compare_vendors...');
    const comparison = await client.sendRequest('tools/call', {
      name: 'compare_vendors',
      arguments: {
        vendorNames: ['Synopsys', 'Cadence', 'Siemens'],
        criteria: ['technology', 'price', 'support'],
        category: 'PHY'
      }
    });
    console.log('Vendor comparison:', comparison.content[0].text);

    console.log('\n=== All tests completed successfully! ===\n');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await client.stop();
  }
}

// Run tests
runTests().catch(console.error);