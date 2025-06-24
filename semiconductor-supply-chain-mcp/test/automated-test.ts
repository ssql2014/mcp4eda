#!/usr/bin/env tsx
/**
 * Automated integration test that simulates Claude Desktop interaction
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import chalk from 'chalk';

interface TestCase {
  name: string;
  tool: string;
  args: any;
  validate?: (result: any) => boolean;
}

const testCases: TestCase[] = [
  {
    name: 'Find DDR5 PHY IP vendors',
    tool: 'find_ip_vendors',
    args: {
      category: 'PHY',
      subcategory: 'DDR5',
      processNode: '7nm',
      limit: 3
    },
    validate: (result) => {
      return result.content && result.content[0].text.includes('DDR5');
    }
  },
  {
    name: 'Find ASIC design services',
    tool: 'find_asic_services',
    args: {
      serviceType: 'design',
      technology: '7nm',
      limit: 5
    },
    validate: (result) => {
      return result.content && result.content[0].text.includes('design');
    }
  },
  {
    name: 'Get ASIC NRE price estimation',
    tool: 'get_price_estimation',
    args: {
      service: 'asic_nre',
      parameters: {
        technology: '7nm',
        complexity: 'high',
        dieSize: 100
      }
    },
    validate: (result) => {
      return result.content && result.content[0].text.includes('$');
    }
  },
  {
    name: 'Compare IP vendors',
    tool: 'compare_vendors',
    args: {
      vendorNames: ['Synopsys', 'Cadence'],
      criteria: ['technology', 'price'],
      category: 'PHY'
    },
    validate: (result) => {
      return result.content && result.content[0].text.includes('Synopsys');
    }
  }
];

async function runAutomatedTests() {
  console.log(chalk.blue.bold('\n🚀 Starting Automated MCP Server Tests\n'));

  // Start the MCP server
  const serverProcess = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // Create client transport
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/index.js'],
  });

  const client = new Client({
    name: 'semiconductor-test-client',
    version: '1.0.0',
  }, {
    capabilities: {}
  });

  try {
    // Connect to server
    await client.connect(transport);
    console.log(chalk.green('✓ Connected to MCP server\n'));

    // List available tools
    const toolsList = await client.listTools();
    console.log(chalk.cyan('Available tools:'));
    toolsList.tools.forEach(tool => {
      console.log(`  - ${chalk.yellow(tool.name)}: ${tool.description}`);
    });
    console.log();

    // Run test cases
    let passed = 0;
    let failed = 0;

    for (const testCase of testCases) {
      process.stdout.write(`Testing "${testCase.name}"... `);
      
      try {
        const result = await client.callTool({
          name: testCase.tool,
          arguments: testCase.args
        });

        if (testCase.validate && !testCase.validate(result)) {
          console.log(chalk.red('✗ Validation failed'));
          failed++;
        } else {
          console.log(chalk.green('✓ Passed'));
          passed++;
          
          // Show sample output
          if (result.content && result.content[0]) {
            const output = result.content[0].text.split('\n').slice(0, 3).join('\n');
            console.log(chalk.gray('  Sample output:'));
            console.log(chalk.gray('  ' + output.replace(/\n/g, '\n  ')));
          }
        }
      } catch (error) {
        console.log(chalk.red(`✗ Error: ${error}`));
        failed++;
      }
      
      console.log();
    }

    // Summary
    console.log(chalk.blue.bold('\n📊 Test Summary:'));
    console.log(`  ${chalk.green(`Passed: ${passed}`)}`);
    console.log(`  ${chalk.red(`Failed: ${failed}`)}`);
    console.log(`  Total: ${testCases.length}`);
    
    if (failed === 0) {
      console.log(chalk.green.bold('\n✅ All tests passed!'));
    } else {
      console.log(chalk.red.bold('\n❌ Some tests failed!'));
    }

  } catch (error) {
    console.error(chalk.red('Test error:'), error);
  } finally {
    // Cleanup
    await client.close();
    serverProcess.kill();
  }
}

// Check Claude Desktop configuration
async function checkClaudeDesktopConfig() {
  const { readFile } = await import('fs/promises');
  const { homedir } = await import('os');
  const { join } = await import('path');
  
  const configPath = join(
    homedir(),
    'Library/Application Support/Claude/claude_desktop_config.json'
  );

  console.log(chalk.blue('\n🔍 Checking Claude Desktop Configuration\n'));

  try {
    const configContent = await readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    
    if (config.mcpServers && config.mcpServers['semiconductor-supply-chain']) {
      console.log(chalk.green('✓ Server is configured in Claude Desktop'));
      console.log(chalk.gray('  Path: ' + config.mcpServers['semiconductor-supply-chain'].args[0]));
    } else {
      console.log(chalk.yellow('⚠ Server not found in Claude Desktop config'));
      console.log(chalk.cyan('\nAdd this to your config:'));
      console.log(chalk.gray(JSON.stringify({
        mcpServers: {
          'semiconductor-supply-chain': {
            command: 'node',
            args: [path.join(process.cwd(), 'dist/index.js')]
          }
        }
      }, null, 2)));
    }
  } catch (error) {
    console.log(chalk.red('✗ Could not read Claude Desktop config'));
    console.log(chalk.gray(`  ${error}`));
  }
}

// Main
async function main() {
  await checkClaudeDesktopConfig();
  await runAutomatedTests();
}

main().catch(console.error);