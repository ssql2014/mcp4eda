#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Test cases for GTKWave MCP
const testCases = [
  {
    name: "List available tools",
    request: {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {}
    }
  },
  {
    name: "List available resources",
    request: {
      jsonrpc: "2.0",
      id: 2,
      method: "resources/list",
      params: {}
    }
  },
  {
    name: "Read formats resource",
    request: {
      jsonrpc: "2.0",
      id: 3,
      method: "resources/read",
      params: {
        uri: "gtkwave://formats"
      }
    }
  },
  {
    name: "Extract signals from VCD",
    request: {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "gtkwave_extract_signals",
        arguments: {
          waveformFile: "/Users/qlss/Documents/mcp4eda/test_gtkwave.vcd",
          hierarchical: true
        }
      }
    }
  },
  {
    name: "Natural language query",
    request: {
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: {
        name: "gtkwave_natural_language",
        arguments: {
          query: "List all signals from test_gtkwave.vcd"
        }
      }
    }
  }
];

async function runTests() {
  console.log("Starting GTKWave MCP Server tests...\n");
  
  const serverPath = path.join(__dirname, 'gtkwave-mcp/dist/index.js');
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let buffer = '';
  let currentTest = 0;

  server.stdout.on('data', (data) => {
    buffer += data.toString();
    
    // Try to parse complete JSON-RPC messages
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const response = JSON.parse(line);
          console.log(`Response for "${testCases[currentTest - 1]?.name}":`);
          console.log(JSON.stringify(response, null, 2));
          console.log('\n---\n');
          
          // Send next test
          if (currentTest < testCases.length) {
            sendNextTest();
          } else {
            console.log("All tests completed!");
            server.kill();
            process.exit(0);
          }
        } catch (e) {
          // Not JSON, might be a log message
          if (!line.includes('running on stdio')) {
            console.error('Non-JSON output:', line);
          }
        }
      }
    }
  });

  server.stderr.on('data', (data) => {
    const msg = data.toString();
    if (!msg.includes('running on stdio')) {
      console.error('Server error:', msg);
    }
  });

  server.on('error', (err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });

  // Wait a bit for server to start
  setTimeout(() => {
    sendNextTest();
  }, 1000);

  function sendNextTest() {
    if (currentTest < testCases.length) {
      const test = testCases[currentTest];
      console.log(`Sending test: ${test.name}`);
      server.stdin.write(JSON.stringify(test.request) + '\n');
      currentTest++;
    }
  }
}

runTests();