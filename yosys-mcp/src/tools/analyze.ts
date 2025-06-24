import { z } from 'zod';
import { AbstractTool } from './base.js';
import { AnalysisResult, StatsData, CheckData, HierarchyData, ResourceData } from '../types/index.js';
import { YosysParser } from '../utils/parser.js';
import { logger } from '../utils/logger.js';

// Schema for analyze tool parameters
const AnalyzeParamsSchema = z.object({
  filepath: z.string().describe('Path to the Verilog/SystemVerilog file to analyze'),
  analysisType: z.enum(['stats', 'check', 'hierarchy', 'resources'])
    .describe('Type of analysis to perform'),
  topModule: z.string().optional().describe('Top module name (auto-detected if not specified)'),
  detailed: z.boolean().default(false).describe('Include detailed analysis information'),
  target: z.enum(['generic', 'xilinx', 'altera', 'ice40', 'ecp5'])
    .default('generic')
    .describe('Target technology for resource estimation'),
});

type AnalyzeParams = z.infer<typeof AnalyzeParamsSchema>;

export class AnalyzeTool extends AbstractTool<AnalyzeParams, AnalysisResult> {
  constructor(configManager: any, cacheManager: any) {
    super('yosys_analyze', 'analysis', configManager, cacheManager, AnalyzeParamsSchema as z.ZodType<AnalyzeParams>);
  }

  getDescription(): string {
    return 'Analyze Verilog/SystemVerilog designs for statistics, hierarchy, and resource usage';
  }

  protected async executeInternal(params: AnalyzeParams): Promise<AnalysisResult> {
    // Resolve and validate input file
    const inputPath = this.resolvePath(params.filepath);
    await this.validateFile(inputPath);

    logger.info(`Analyzing ${inputPath} - type: ${params.analysisType}`);

    try {
      let data: StatsData | CheckData | HierarchyData | ResourceData;

      switch (params.analysisType) {
        case 'stats':
          data = await this.analyzeStats(inputPath, params);
          break;
        case 'check':
          data = await this.analyzeCheck(inputPath, params);
          break;
        case 'hierarchy':
          data = await this.analyzeHierarchy(inputPath, params);
          break;
        case 'resources':
          data = await this.analyzeResources(inputPath, params);
          break;
      }

      return {
        success: true,
        type: params.analysisType,
        data,
        metadata: {},
      };
    } catch (error) {
      return this.createBaseResult(false, error instanceof Error ? error.message : 'Analysis failed');
    }
  }

  private async analyzeStats(inputPath: string, params: AnalyzeParams): Promise<StatsData> {
    const script = [
      `read_verilog "${inputPath}"`,
    ];

    if (params.topModule) {
      script.push(`hierarchy -check -top ${params.topModule}`);
    } else {
      script.push('hierarchy -check -auto-top');
    }

    script.push('proc');
    
    if (params.detailed) {
      script.push('flatten');
      script.push('stat -width -liberty');
    } else {
      script.push('stat');
    }

    const result = await this.runner.runScript(script);
    return YosysParser.parseStats(result.stdout);
  }

  private async analyzeCheck(inputPath: string, params: AnalyzeParams): Promise<CheckData> {
    const script = [
      `read_verilog "${inputPath}"`,
    ];

    if (params.topModule) {
      script.push(`hierarchy -check -top ${params.topModule}`);
    } else {
      script.push('hierarchy -check -auto-top');
    }

    // Run various checks
    script.push('proc');
    script.push('check -noinit');
    script.push('check -assert');
    
    if (params.detailed) {
      script.push('check -initdrv');
    }

    const result = await this.runner.runScript(script);
    const checkData = YosysParser.parseCheck(result.stdout + '\n' + result.stderr);

    return checkData;
  }

  private async analyzeHierarchy(inputPath: string, params: AnalyzeParams): Promise<HierarchyData> {
    const script = [
      `read_verilog "${inputPath}"`,
    ];

    if (params.topModule) {
      script.push(`hierarchy -check -top ${params.topModule}`);
    } else {
      script.push('hierarchy -check -auto-top');
    }

    // Get hierarchy information
    script.push('hierarchy -libdir');
    
    if (params.detailed) {
      script.push('ls -long');
    } else {
      script.push('ls');
    }

    const result = await this.runner.runScript(script);
    
    // Try to get hierarchy from output
    let hierarchyData: HierarchyData;
    
    // First try to parse structured hierarchy output
    if (result.stdout.includes('Hierarchy tree:')) {
      hierarchyData = YosysParser.parseHierarchy(result.stdout);
    } else {
      // Fallback: extract module list
      const modules = YosysParser.extractModules(result.stdout);
      hierarchyData = {
        topModule: params.topModule || modules[0] || 'unknown',
        modules: modules.map(name => ({
          name,
          type: 'module',
          instances: 1,
          children: [],
        })),
      };
    }

    return hierarchyData;
  }

  private async analyzeResources(inputPath: string, params: AnalyzeParams): Promise<ResourceData> {
    const script = [
      `read_verilog "${inputPath}"`,
    ];

    if (params.topModule) {
      script.push(`hierarchy -check -top ${params.topModule}`);
    } else {
      script.push('hierarchy -check -auto-top');
    }

    // Synthesize for target to get accurate resource usage
    switch (params.target) {
      case 'xilinx':
        script.push('synth_xilinx -run :map_cells');
        break;
      case 'altera':
        script.push('synth_intel -run :map_cells');
        break;
      case 'ice40':
        script.push('synth_ice40 -run :map_cells');
        break;
      case 'ecp5':
        script.push('synth_ecp5 -run :map_cells');
        break;
      default:
        script.push('proc');
        script.push('opt');
        script.push('memory');
        script.push('techmap');
        break;
    }

    // Get detailed statistics
    script.push('stat -tech ' + params.target);

    const result = await this.runner.runScript(script);
    return YosysParser.parseResources(result.stdout, params.target);
  }
}