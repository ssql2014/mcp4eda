#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log(`
=====================================
GTKWave MCP Server Demo
=====================================

This demo showcases the GTKWave MCP server capabilities.
Test file: test_gtkwave.vcd
`);

// Demo scenarios
const demos = [
  {
    name: "📋 Extract signals from VCD file",
    tool: "gtkwave_extract_signals",
    args: {
      waveformFile: "/Users/qlss/Documents/mcp4eda/test_gtkwave.vcd",
      hierarchical: true
    }
  },
  {
    name: "🔍 Extract only clock signals",
    tool: "gtkwave_extract_signals", 
    args: {
      waveformFile: "/Users/qlss/Documents/mcp4eda/test_gtkwave.vcd",
      pattern: "clk",
      hierarchical: false
    }
  },
  {
    name: "💬 Natural language: List all signals",
    tool: "gtkwave_natural_language",
    args: {
      query: "List all signals from test_gtkwave.vcd"
    }
  },
  {
    name: "💬 Natural language: Convert VCD to FST",
    tool: "gtkwave_natural_language",
    args: {
      query: "Convert test_gtkwave.vcd to fst with compression"
    }
  },
  {
    name: "📚 Read waveform formats resource",
    resource: "gtkwave://formats"
  },
  {
    name: "📚 Read TCL commands reference",
    resource: "gtkwave://tcl-commands"
  },
  {
    name: "📊 Generate analysis script",
    tool: "gtkwave_generate_script",
    args: {
      waveformFile: "/Users/qlss/Documents/mcp4eda/test_gtkwave.vcd",
      operations: [
        { type: "add_signal", parameters: { signal: "top.clk" } },
        { type: "add_signal", parameters: { signal: "top.data" } },
        { type: "set_cursor", parameters: { time: "100ns" } },
        { type: "zoom", parameters: { startTime: "0", endTime: "200ns" } }
      ],
      outputFile: "/Users/qlss/Documents/mcp4eda/analysis.tcl"
    }
  }
];

async function runDemo() {
  const serverPath = path.join(__dirname, 'gtkwave-mcp/dist/index.js');
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let buffer = '';
  let currentDemo = 0;
  let requestId = 1;

  server.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.trim() && !line.includes('running on stdio')) {
        try {
          const response = JSON.parse(line);
          
          if (response.result) {
            console.log(`✅ Success!`);
            
            // Format the output nicely
            if (response.result.content) {
              const content = response.result.content[0];
              if (content.text) {
                try {
                  const parsed = JSON.parse(content.text);
                  console.log(JSON.stringify(parsed, null, 2));
                } catch {
                  console.log(content.text);
                }
              }
            } else if (response.result.contents) {
              const contents = response.result.contents[0];
              if (contents.mimeType === 'application/json') {
                const parsed = JSON.parse(contents.text);
                console.log(JSON.stringify(parsed, null, 2));
              } else {
                console.log(contents.text.substring(0, 500) + '...');
              }
            }
          } else if (response.error) {
            console.log(`❌ Error: ${response.error.message}`);
          }
          
          console.log('\n' + '-'.repeat(50) + '\n');
          
          // Run next demo
          setTimeout(() => {
            if (currentDemo < demos.length) {
              runNextDemo();
            } else {
              console.log("🎉 All demos completed!");
              server.kill();
              process.exit(0);
            }
          }, 1000);
        } catch (e) {
          // Not JSON
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

  // Wait for server to start
  setTimeout(() => {
    runNextDemo();
  }, 1000);

  function runNextDemo() {
    if (currentDemo < demos.length) {
      const demo = demos[currentDemo];
      console.log(`🚀 ${demo.name}`);
      
      let request;
      if (demo.tool) {
        request = {
          jsonrpc: "2.0",
          id: requestId++,
          method: "tools/call",
          params: {
            name: demo.tool,
            arguments: demo.args
          }
        };
      } else if (demo.resource) {
        request = {
          jsonrpc: "2.0",
          id: requestId++,
          method: "resources/read",
          params: {
            uri: demo.resource
          }
        };
      }
      
      server.stdin.write(JSON.stringify(request) + '\n');
      currentDemo++;
    }
  }
}

runDemo();