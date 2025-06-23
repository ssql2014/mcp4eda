import { z } from 'zod';

export interface ParsedModule {
  name: string;
  filepath: string;
  line: number;
  ports: Port[];
  parameters: Parameter[];
  instances: ModuleInstance[];
  signals: Signal[];
  registers: Register[];
  always_blocks: AlwaysBlock[];
}

export interface Port {
  name: string;
  direction: 'input' | 'output' | 'inout';
  width: number;
  type: string;
  line: number;
}

export interface Parameter {
  name: string;
  value: string;
  type: string;
  line: number;
}

export interface Signal {
  name: string;
  type: 'wire' | 'reg' | 'logic';
  width: number;
  line: number;
}

export interface Register {
  name: string;
  type: 'flip_flop' | 'latch' | 'potential_register';
  clock?: string;
  reset?: string;
  width: number;
  line: number;
}

export interface ModuleInstance {
  name: string;
  module_type: string;
  parameters: Record<string, string>;
  connections: Record<string, string>;
  line: number;
}

export interface AlwaysBlock {
  type: 'combinational' | 'sequential';
  sensitivity_list: string[];
  line: number;
}

export interface ProjectStats {
  total_modules: number;
  total_registers: number;
  total_flip_flops: number;
  total_latches: number;
  total_lines: number;
  files_parsed: number;
}

export interface QueryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Verible command schemas
export const VeribleLintResultSchema = z.object({
  file: z.string(),
  violations: z.array(z.object({
    line: z.number(),
    column: z.number(),
    rule: z.string(),
    message: z.string(),
    severity: z.enum(['error', 'warning', 'info'])
  }))
});

export const VeribleSyntaxTreeSchema = z.object({
  file: z.string(),
  tree: z.any() // Will be refined based on Verible output
});

export type VeribleLintResult = z.infer<typeof VeribleLintResultSchema>;
export type VeribleSyntaxTree = z.infer<typeof VeribleSyntaxTreeSchema>;