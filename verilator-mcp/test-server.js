// Test script to verify Verilator MCP server

const { spawn } = require('child_process');
const path = require('path');

console.log('Testing Verilator MCP Server...\n');

// Start the server
const serverPath = path.join(__dirname, 'dist', 'index.js');
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Send initialization request
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  }
};

// Send list tools request
const listToolsRequest = {
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/list',
  params: {}
};

let buffer = '';

server.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    if (line) {
      try {
        const response = JSON.parse(line);
        
        if (response.id === 1) {
          console.log('✓ Server initialized successfully');
          console.log(`  Name: ${response.result.serverInfo.name}`);
          console.log(`  Version: ${response.result.serverInfo.version}\n`);
          
          // Send list tools request
          server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
        } else if (response.id === 2) {
          console.log('✓ Available tools:');
          response.result.tools.forEach(tool => {
            console.log(`  - ${tool.name}: ${tool.description}`);
          });
          
          // Success - exit
          console.log('\n✅ Verilator MCP Server is working correctly!');
          server.kill();
          process.exit(0);
        }
      } catch (e) {
        // Not JSON, ignore
      }
    }
  }
  
  buffer = lines[lines.length - 1];
});

server.stderr.on('data', (data) => {
  console.error('Server error:', data.toString());
});

server.on('close', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`\n❌ Server exited with code ${code}`);
    process.exit(1);
  }
});

// Send initialization
setTimeout(() => {
  server.stdin.write(JSON.stringify(initRequest) + '\n');
}, 100);

// Timeout after 5 seconds
setTimeout(() => {
  console.error('\n❌ Test timed out');
  server.kill();
  process.exit(1);
}, 5000);