import { z } from 'zod';
import * as path from 'path';
import { AbstractTool } from './base.js';
import { CommandResult } from '../utils/executor.js';
import { ToolResult, LintResult, LintViolation } from '../types/index.js';
import { logger } from '../utils/logger.js';

// Schema for lint tool parameters
const LintParamsSchema = z.object({
  filepath: z.string().describe('Path to the file to lint'),
  rules: z.array(z.string()).optional().describe('Specific rules to enable'),
  waiver_files: z.array(z.string()).optional().describe('Paths to waiver files'),
  fix: z.boolean().default(false).describe('Apply automatic fixes'),
  ruleset: z.string().optional().describe('Predefined ruleset to use'),
  config_file: z.string().optional().describe('Configuration file path'),
  show_diagnostic_context: z.boolean().default(false),
});

type LintParams = z.infer<typeof LintParamsSchema>;

export class LintTool extends AbstractTool<LintParams, LintResult> {
  constructor(configManager: any, cacheManager: any) {
    super('verible_lint', 'lint', configManager, cacheManager, LintParamsSchema);
  }

  getDescription(): string {
    return 'Run Verible linting on SystemVerilog/Verilog files to check code style and quality';
  }

  protected buildArguments(params: LintParams): string[] {
    const args: string[] = [];

    // Add rules if specified
    if (params.rules && params.rules.length > 0) {
      for (const rule of params.rules) {
        args.push(`--rules=${rule}`);
      }
    } else if (params.ruleset) {
      // Use predefined ruleset
      args.push(`--ruleset=${params.ruleset}`);
    } else {
      // Default to all rules
      args.push('--rules=all');
    }

    // Add waiver files
    if (params.waiver_files) {
      for (const waiverFile of params.waiver_files) {
        args.push(`--waiver_files=${waiverFile}`);
      }
    }

    // Add config file
    if (params.config_file) {
      args.push(`--config=${params.config_file}`);
    }

    // Add autofix flag
    if (params.fix) {
      args.push('--autofix=inplace');
    }

    // Add diagnostic context
    if (params.show_diagnostic_context) {
      args.push('--show_diagnostic_context');
    }

    // Add the file path
    args.push(params.filepath);

    return args;
  }

  protected async processResult(
    result: CommandResult,
    params: LintParams
  ): Promise<ToolResult<LintResult>> {
    try {
      const violations = this.parseViolations(result.stdout + '\n' + result.stderr);
      
      // Group violations by rule and severity
      const byRule: Record<string, number> = {};
      const bySeverity: Record<string, number> = {};
      let fixedViolations = 0;

      for (const violation of violations) {
        // Count by rule
        byRule[violation.rule] = (byRule[violation.rule] || 0) + 1;
        
        // Count by severity
        bySeverity[violation.severity] = (bySeverity[violation.severity] || 0) + 1;
      }

      // If autofix was applied, try to detect fixed violations
      if (params.fix && result.exitCode === 0) {
        // Re-run lint to see remaining violations
        const checkResult = await this.executor.execute(
          (await this.configManager.getConfig()).toolPaths.lint,
          this.buildArguments({ ...params, fix: false })
        );
        const remainingViolations = this.parseViolations(checkResult.stdout + '\n' + checkResult.stderr);
        fixedViolations = violations.length - remainingViolations.length;
      }

      const lintResult: LintResult = {
        violations,
        totalViolations: violations.length,
        fixedViolations: params.fix ? fixedViolations : undefined,
        byRule,
        bySeverity,
      };

      return {
        success: true,
        data: lintResult,
        warnings: result.exitCode !== 0 && violations.length === 0 
          ? ['Lint completed with warnings but no violations found'] 
          : undefined,
      };

    } catch (error) {
      logger.error('Failed to process lint result:', error);
      return {
        success: false,
        error: `Failed to parse lint output: ${error}`,
      };
    }
  }

  private parseViolations(output: string): LintViolation[] {
    const violations: LintViolation[] = [];
    const lines = output.split('\n');

    // Verible lint output format:
    // filepath:line:column: message [rule-name]
    const violationRegex = /^(.+?):(\d+):(\d+):\s*(.+?)\s*\[([^\]]+)\]/;

    for (const line of lines) {
      const match = line.match(violationRegex);
      if (match) {
        const [, file, lineStr, columnStr, message, rule] = match;
        
        // Determine severity based on message or rule
        let severity: 'error' | 'warning' | 'info' = 'warning';
        if (message.toLowerCase().includes('error')) {
          severity = 'error';
        } else if (message.toLowerCase().includes('info')) {
          severity = 'info';
        }

        violations.push({
          file: path.resolve(file),
          line: parseInt(lineStr, 10),
          column: parseInt(columnStr, 10),
          message: message.trim(),
          rule,
          severity,
          autoFixAvailable: this.isAutoFixAvailable(rule),
        });
      }
    }

    return violations;
  }

  private isAutoFixAvailable(rule: string): boolean {
    // Some rules support autofix in Verible
    const autoFixableRules = [
      'trailing-spaces',
      'no-tabs',
      'line-length',
      'blank-line-before-else',
      'module-filename',
      // Add more as discovered
    ];

    return autoFixableRules.some(r => rule.includes(r));
  }

  protected getCacheKey(params: LintParams): string | null {
    // Cache lint results based on file path and parameters
    const cacheData = {
      filepath: params.filepath,
      rules: params.rules?.sort(),
      ruleset: params.ruleset,
      waiver_files: params.waiver_files?.sort(),
    };
    return this.cacheManager.generateKey('lint', cacheData);
  }

  protected shouldUseCache(params: LintParams): boolean {
    // Don't cache if we're applying fixes
    return !params.fix;
  }

  protected getFilePath(params: LintParams): string {
    return params.filepath;
  }

  protected getDependencies(params: LintParams): string[] | undefined {
    // Include waiver files as dependencies
    return params.waiver_files;
  }

  getInputSchema(): any {
    return {
      type: 'object',
      properties: {
        filepath: {
          type: 'string',
          description: 'Path to the file to lint',
        },
        rules: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific rules to enable',
        },
        waiver_files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Paths to waiver files',
        },
        fix: {
          type: 'boolean',
          description: 'Apply automatic fixes where possible',
          default: false,
        },
        ruleset: {
          type: 'string',
          description: 'Predefined ruleset to use',
        },
        config_file: {
          type: 'string',
          description: 'Configuration file path',
        },
        show_diagnostic_context: {
          type: 'boolean',
          description: 'Show additional context for diagnostics',
          default: false,
        },
      },
      required: ['filepath'],
    };
  }
}