#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';

import { ConfigManager } from './utils/config.js';
import { CacheManager } from './utils/cache.js';
import { ErrorHandler } from './utils/error-handler.js';
import { logger, mcpLogger } from './utils/logger.js';

// Tool implementations
import { LintTool } from './tools/lint.js';
import { FormatTool } from './tools/format.js';
import { SyntaxTool } from './tools/syntax.js';
import { AnalyzeTool } from './tools/analyze.js';
import { ProjectTool } from './tools/project.js';
import { DiffTool } from './tools/diff.js';
import { ObfuscateTool } from './tools/obfuscate.js';
import { NaturalLanguageTool } from './tools/natural-language.js';
import { AbstractTool } from './tools/base.js';

class VeribleMCPServer {
  private server: Server;
  private configManager: ConfigManager;
  private cacheManager: CacheManager;
  private tools: Map<string, AbstractTool>;

  constructor() {
    this.server = new Server(
      {
        name: 'verible-mcp',
        vendor: 'mcp4eda',
        version: '0.1.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
      }
    );

    this.configManager = new ConfigManager();
    this.cacheManager = new CacheManager({
      maxSize: 1000,
      ttl: 1000 * 60 * 30, // 30 minutes
    });

    this.tools = new Map();
    this.initializeTools();
    this.setupHandlers();
  }

  private initializeTools() {
    // Initialize all tools
    this.tools.set('verible_lint', new LintTool(this.configManager, this.cacheManager));
    this.tools.set('verible_format', new FormatTool(this.configManager, this.cacheManager));
    const syntaxTool = new SyntaxTool(this.configManager, this.cacheManager);
    this.tools.set('verible_syntax', syntaxTool);
    this.tools.set('verible_analyze', new AnalyzeTool(this.configManager, this.cacheManager, syntaxTool));
    this.tools.set('verible_project', new ProjectTool(this.configManager, this.cacheManager));
    this.tools.set('verible_diff', new DiffTool(this.configManager, this.cacheManager));
    this.tools.set('verible_obfuscate', new ObfuscateTool(this.configManager, this.cacheManager));
    
    // Natural language tool needs access to other tools
    this.tools.set('natural_language_query', new NaturalLanguageTool(
      this.configManager,
      this.cacheManager,
      this.tools
    ));
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      await this.configManager.initialize();
      
      const tools = [];
      for (const [name, tool] of this.tools) {
        const available = await this.configManager.isToolAvailable(tool['binaryName']);
        if (available) {
          tools.push({
            name,
            description: tool.getDescription(),
            inputSchema: tool.getInputSchema(),
          });
        }
      }
      
      return { tools };
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'verible://project/stats',
          name: 'Project Statistics',
          description: 'Overall project statistics and health metrics',
          mimeType: 'application/json',
        },
        {
          uri: 'verible://lint/summary',
          name: 'Lint Summary',
          description: 'Summary of all lint violations in the project',
          mimeType: 'application/json',
        },
        {
          uri: 'verible://cache/stats',
          name: 'Cache Statistics',
          description: 'Cache performance and usage statistics',
          mimeType: 'application/json',
        },
      ],
    }));

    // Read resource content
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      switch (uri) {
        case 'verible://cache/stats': {
          const stats = this.cacheManager.getStats();
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(stats, null, 2),
              },
            ],
          };
        }

        case 'verible://project/stats': {
          // Placeholder - will be implemented with actual project analysis
          const stats = {
            fileCount: 0,
            moduleCount: 0,
            totalLines: 0,
            lastUpdated: new Date().toISOString(),
          };
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(stats, null, 2),
              },
            ],
          };
        }

        case 'verible://lint/summary': {
          // Placeholder - will be implemented with actual lint data
          const summary = {
            totalViolations: 0,
            byRule: {},
            bySeverity: {},
            lastUpdated: new Date().toISOString(),
          };
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(summary, null, 2),
              },
            ],
          };
        }

        default:
          throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
      }
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const tool = this.tools.get(name);
        if (!tool) {
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }

        const result = await tool.execute(args);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        throw ErrorHandler.toMcpError(error, name);
      }
    });

    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [
        {
          name: 'code_review',
          description: 'Comprehensive code quality review',
          arguments: [
            {
              name: 'focus_area',
              description: 'Specific area to focus on (style, performance, correctness)',
              required: false,
            },
          ],
        },
        {
          name: 'style_compliance',
          description: 'Check code against style guide',
          arguments: [
            {
              name: 'style_guide',
              description: 'Name of the style guide to check against',
              required: false,
            },
          ],
        },
        {
          name: 'refactor_suggestions',
          description: 'Suggest refactoring opportunities',
          arguments: [],
        },
        {
          name: 'natural_language',
          description: 'Process natural language queries about Verilog code',
          arguments: [
            {
              name: 'current_file',
              description: 'Current file being worked on',
              required: false,
            },
            {
              name: 'project_root',
              description: 'Root directory of the project',
              required: false,
            },
          ],
        },
      ],
    }));

    // Get specific prompt
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'code_review':
          return {
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Please perform a comprehensive code review${
                    args?.focus_area ? ` with focus on ${args.focus_area}` : ''
                  }.

Use the available Verible tools to:
1. Run linting to identify style and quality issues
2. Check for formatting inconsistencies
3. Analyze the code structure and complexity
4. Identify potential bugs or anti-patterns
5. Suggest improvements

Provide a detailed report including:
- Summary of findings
- Critical issues that need immediate attention
- Style and formatting recommendations
- Performance considerations
- Best practice suggestions`,
                },
              },
            ],
          };

        case 'style_compliance':
          return {
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Check the code for compliance with ${
                    args?.style_guide || 'standard'
                  } style guide.

Use verible_lint with appropriate rules to:
1. Identify all style violations
2. Group violations by type and severity
3. Suggest fixes where available
4. Highlight patterns of non-compliance

Report should include:
- Total violations by category
- Most common issues
- Specific examples with line numbers
- Remediation steps`,
                },
              },
            ],
          };

        case 'refactor_suggestions':
          return {
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Analyze the code for refactoring opportunities.

Use the Verible tools to:
1. Parse the code structure
2. Identify complex or duplicated patterns
3. Find overly long modules or functions
4. Detect potential design improvements

Provide suggestions for:
- Code simplification
- Module decomposition
- Naming improvements
- Pattern standardization
- Testability enhancements`,
                },
              },
            ],
          };

        case 'natural_language':
          return {
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `I'll help you with Verilog code using natural language queries.

You can ask questions like:
- "Check style violations in my file"
- "Format this code with 4 spaces"
- "How many registers are in cpu_core.v?"
- "Analyze the project structure"
- "Compare old.v and new.v"
- "Obfuscate design.v but keep the interface"

Use the natural_language_query tool with your question${
                    args?.current_file ? `, working on ${args.current_file}` : ''
                  }${
                    args?.project_root ? ` in project ${args.project_root}` : ''
                  }.

Example queries:
- natural_language_query: "lint file.v and fix issues"
- natural_language_query: "count registers in all files"
- natural_language_query: "format current file with 2 spaces"`,
                },
              },
            ],
          };

        default:
          throw new McpError(ErrorCode.InvalidRequest, `Unknown prompt: ${name}`);
      }
    });
  }

  async start() {
    try {
      // Initialize configuration
      await this.configManager.loadUserConfig();
      await this.configManager.initialize();

      const config = await this.configManager.getConfig();
      if (!config.isAvailable) {
        mcpLogger.warn('Verible not found - running with limited functionality');
      } else {
        mcpLogger.info(`Verible ${config.version} ready`);
      }

      // Connect to transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      mcpLogger.info('Verible MCP server started successfully');
    } catch (error) {
      mcpLogger.error('Failed to start server:', error);
      throw error;
    }
  }
}

// Start the server
const server = new VeribleMCPServer();
server.start().catch((error) => {
  mcpLogger.error('Fatal error during startup:', error);
  process.exit(1);
});