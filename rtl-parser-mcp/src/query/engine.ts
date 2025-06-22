import { ParsedModule, ProjectStats, QueryResult } from '../types/index.js';
import { CacheDatabase } from '../database/cache.js';
import { logger } from '../utils/logger.js';

export class QueryEngine {
  constructor(private cache: CacheDatabase) {}

  async queryRegisters(
    modules: ParsedModule[], 
    options?: { scope?: string; type?: 'flip_flop' | 'latch' | 'all' }
  ): QueryResult<any> {
    try {
      const scope = options?.scope;
      const type = options?.type || 'all';
      
      let registers = [];
      
      for (const module of modules) {
        if (scope && module.name !== scope) continue;
        
        for (const reg of module.registers) {
          if (type === 'all' || reg.type === type) {
            registers.push({
              name: reg.name,
              module: module.name,
              type: reg.type,
              width: reg.width,
              clock: reg.clock,
              reset: reg.reset,
              file: module.filepath,
              line: reg.line
            });
          }
        }
      }
      
      // Calculate statistics
      const stats = {
        total: registers.length,
        by_type: {
          flip_flop: registers.filter(r => r.type === 'flip_flop').length,
          latch: registers.filter(r => r.type === 'latch').length
        },
        by_module: {} as Record<string, number>
      };
      
      for (const reg of registers) {
        stats.by_module[reg.module] = (stats.by_module[reg.module] || 0) + 1;
      }
      
      return {
        success: true,
        data: {
          registers,
          stats
        }
      };
    } catch (error) {
      logger.error('Error querying registers:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async analyzeModule(
    modules: ParsedModule[],
    moduleName: string,
    analysisType: 'hierarchy' | 'ports' | 'parameters' | 'all'
  ): QueryResult<any> {
    try {
      const module = modules.find(m => m.name === moduleName);
      
      if (!module) {
        return {
          success: false,
          error: `Module '${moduleName}' not found`
        };
      }
      
      const result: any = {
        name: module.name,
        file: module.filepath,
        line: module.line
      };
      
      if (analysisType === 'ports' || analysisType === 'all') {
        result.ports = module.ports.map(p => ({
          name: p.name,
          direction: p.direction,
          type: p.type,
          width: p.width,
          line: p.line
        }));
        result.port_summary = {
          total: module.ports.length,
          inputs: module.ports.filter(p => p.direction === 'input').length,
          outputs: module.ports.filter(p => p.direction === 'output').length,
          inouts: module.ports.filter(p => p.direction === 'inout').length
        };
      }
      
      if (analysisType === 'parameters' || analysisType === 'all') {
        result.parameters = module.parameters;
      }
      
      if (analysisType === 'hierarchy' || analysisType === 'all') {
        result.instances = module.instances.map(inst => ({
          name: inst.name,
          module_type: inst.module_type,
          parameter_count: Object.keys(inst.parameters).length,
          port_connections: Object.keys(inst.connections).length,
          line: inst.line
        }));
        
        // Find instantiated modules
        const instantiatedTypes = [...new Set(module.instances.map(i => i.module_type))];
        result.instantiates = instantiatedTypes;
        
        // Find where this module is instantiated
        const instantiatedIn = [];
        for (const m of modules) {
          if (m.instances.some(i => i.module_type === moduleName)) {
            instantiatedIn.push(m.name);
          }
        }
        result.instantiated_in = instantiatedIn;
      }
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error('Error analyzing module:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async traceSignal(
    modules: ParsedModule[],
    signalName: string,
    scope?: string
  ): QueryResult<any> {
    try {
      const results = [];
      
      for (const module of modules) {
        if (scope && module.name !== scope) continue;
        
        // Check ports
        const port = module.ports.find(p => p.name === signalName);
        if (port) {
          results.push({
            type: 'port',
            module: module.name,
            direction: port.direction,
            width: port.width,
            file: module.filepath,
            line: port.line
          });
        }
        
        // Check signals
        const signal = module.signals.find(s => s.name === signalName);
        if (signal) {
          results.push({
            type: 'signal',
            module: module.name,
            signal_type: signal.type,
            width: signal.width,
            file: module.filepath,
            line: signal.line
          });
        }
        
        // Check instance connections
        for (const instance of module.instances) {
          for (const [port, connection] of Object.entries(instance.connections)) {
            if (connection === signalName) {
              results.push({
                type: 'connection',
                module: module.name,
                instance: instance.name,
                instance_type: instance.module_type,
                port: port,
                file: module.filepath,
                line: instance.line
              });
            }
          }
        }
      }
      
      return {
        success: true,
        data: {
          signal: signalName,
          occurrences: results,
          summary: {
            total: results.length,
            by_type: {
              port: results.filter(r => r.type === 'port').length,
              signal: results.filter(r => r.type === 'signal').length,
              connection: results.filter(r => r.type === 'connection').length
            }
          }
        }
      };
    } catch (error) {
      logger.error('Error tracing signal:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getProjectStats(modules: ParsedModule[]): QueryResult<ProjectStats> {
    try {
      const stats: ProjectStats = {
        total_modules: modules.length,
        total_registers: 0,
        total_flip_flops: 0,
        total_latches: 0,
        total_lines: 0,
        files_parsed: new Set(modules.map(m => m.filepath)).size
      };
      
      for (const module of modules) {
        stats.total_registers += module.registers.length;
        stats.total_flip_flops += module.registers.filter(r => r.type === 'flip_flop').length;
        stats.total_latches += module.registers.filter(r => r.type === 'latch').length;
      }
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      logger.error('Error getting project stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}