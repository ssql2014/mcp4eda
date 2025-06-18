# AnySilicon MCP Project Plan (Enhanced)

## Project Overview
Create an MCP (Model Context Protocol) server for calculating die per wafer in semiconductor manufacturing with advanced features for production use.

## Core Functionality
The MCP will provide tools for:
1. **Basic Die Per Wafer Calculation**
   - Input: wafer diameter, die width, die height, scribe lane width, edge exclusion
   - Output: number of dies per wafer, wafer utilization percentage
   - Multiple placement algorithms (rectangular, hexagonal)

2. **Advanced Yield Calculations**
   - Die yield considering defect density
   - Gross die per wafer vs. good die per wafer
   - Cost per die calculations with fab cost inputs

3. **Batch Processing**
   - Calculate for multiple die sizes on same wafer
   - Compare different wafer sizes (200mm, 300mm, 450mm)
   - Multi-project wafer (MPW) support

4. **Validation and Analysis**
   - Pre-validation of parameters
   - Standard wafer size information
   - Visualization output for die placement

## Technical Architecture

### Enhanced Directory Structure
```
anysilicon/
├── src/
│   ├── index.ts                # MCP server entry point
│   ├── config/                 # Configuration management
│   │   ├── defaults.ts         # Default calculation values
│   │   └── server.config.ts    # Server configuration
│   ├── calculations/           # Calculation logic
│   │   ├── diePerWafer.ts
│   │   ├── algorithms/         # Placement algorithms
│   │   │   ├── rectangular.ts
│   │   │   └── hexagonal.ts
│   │   ├── yieldCalculator.ts
│   │   ├── costCalculator.ts
│   │   └── types.ts
│   ├── tools/                  # MCP tool definitions
│   │   ├── calculateDiePerWafer.ts
│   │   ├── calculateYield.ts
│   │   ├── calculateCost.ts
│   │   ├── batchCalculate.ts
│   │   ├── validateParameters.ts
│   │   └── getStandardWaferSizes.ts
│   ├── utils/                  # Helper functions
│   │   ├── validation.ts
│   │   ├── cache.ts            # Caching layer
│   │   └── visualization.ts    # Die placement visualization
│   ├── errors/                 # Custom error types
│   │   └── index.ts
│   ├── schemas/                # JSON schemas
│   │   ├── tools.schema.json
│   │   └── validation.schema.json
│   └── logging/                # Logging infrastructure
│       └── logger.ts
├── tests/
│   ├── unit/
│   │   ├── calculations/
│   │   ├── validation/
│   │   └── utils/
│   ├── integration/
│   │   ├── mcp-server.test.ts
│   │   └── tools.test.ts
│   ├── e2e/
│   │   └── scenarios.test.ts
│   └── fixtures/
│       └── test-data.json
├── docs/
│   ├── API.md                  # API documentation
│   ├── FORMULAS.md             # Mathematical formulas
│   └── INTEGRATION.md          # Integration guide
├── scripts/
│   ├── build.sh                # Build scripts
│   └── validate.sh             # Validation scripts
├── .github/
│   └── workflows/
│       ├── ci.yml              # CI/CD pipeline
│       └── release.yml         # Release automation
├── package.json
├── tsconfig.json
├── jest.config.js
├── .eslintrc.json
├── .prettierrc
├── .env.example
├── README.md
└── examples/
    ├── basic-calculation.md
    ├── batch-processing.md
    └── mpw-optimization.md
```

## Enhanced Type Definitions

```typescript
// Strict type definitions with constraints
type WaferDiameter = 150 | 200 | 300 | 450;

interface DiePerWaferParams {
  wafer_diameter: WaferDiameter;
  die_width: number;          // min: 0.1, max: wafer_diameter
  die_height: number;         // min: 0.1, max: wafer_diameter
  scribe_lane?: number;       // min: 0.05, max: 0.2, default: 0.1
  edge_exclusion?: number;    // min: 2, max: 5, default: 3
  algorithm?: 'rectangular' | 'hexagonal'; // default: 'rectangular'
}

interface BatchConfiguration {
  id: string;
  calculation_type: 'die_per_wafer' | 'yield' | 'cost';
  parameters: Record<string, any>;
  metadata?: Record<string, any>;
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  }
}

interface MPWConfiguration {
  projects: Array<{
    id: string;
    die_width: number;
    die_height: number;
    quantity: number;
  }>;
  optimization_strategy: 'maximize_dies' | 'minimize_cost';
}
```

## MCP Server Implementation

```typescript
// Proper MCP server setup with transport configuration
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const server = new Server({
  name: 'anysilicon-mcp',
  version: '1.0.0',
  description: 'MCP server for semiconductor die calculations'
});

// Server capabilities
server.setCapabilities({
  tools: true,
  resources: true,
  prompts: true
});

// Tool registration with error handling
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;
    
    // Route to appropriate tool handler
    switch (name) {
      case 'calculate_die_per_wafer':
        return await handleDiePerWafer(args);
      case 'validate_parameters':
        return await handleValidation(args);
      // ... other tools
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message,
        details: error.details
      }
    };
  }
});
```

## Enhanced MCP Tools Specification

### 1. calculate_die_per_wafer
Calculate the number of dies that fit on a wafer with multiple algorithms.

**Parameters:**
- `wafer_diameter`: WaferDiameter - Standard wafer size
- `die_width`: number (mm) - Die width (validated range)
- `die_height`: number (mm) - Die height (validated range)
- `scribe_lane`: number (mm) - Scribe lane width (0.05-0.2)
- `edge_exclusion`: number (mm) - Edge exclusion zone (2-5)
- `algorithm`: 'rectangular' | 'hexagonal' - Placement algorithm
- `include_visualization`: boolean - Generate placement visualization

**Returns:**
- `total_dies`: number - Total number of complete dies
- `wafer_area`: number - Total wafer area (mm²)
- `utilized_area`: number - Area used by dies (mm²)
- `utilization_percentage`: number - Percentage of wafer utilized
- `algorithm_used`: string - Algorithm applied
- `visualization_url`: string (optional) - Link to placement visualization

### 2. validate_parameters
Pre-validate calculation parameters before processing.

**Parameters:**
- `operation`: string - Operation to validate for
- `parameters`: object - Parameters to validate

**Returns:**
- `valid`: boolean - Whether parameters are valid
- `errors`: array - List of validation errors
- `warnings`: array - List of warnings
- `suggestions`: array - Optimization suggestions

### 3. get_standard_wafer_sizes
Get standard wafer size information.

**Returns:**
- `sizes`: array of objects containing:
  - `diameter`: number
  - `area`: number
  - `typical_edge_exclusion`: number
  - `common_applications`: array

### 4. calculate_cost_per_die
Calculate cost per die with fab inputs.

**Parameters:**
- `wafer_cost`: number - Cost per wafer
- `total_dies`: number - Dies per wafer
- `yield_percentage`: number - Expected yield
- `additional_costs`: object - Processing, testing costs

**Returns:**
- `cost_per_die`: number
- `cost_per_good_die`: number
- `cost_breakdown`: object

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- Set up TypeScript project with all configurations
- Implement error handling and logging
- Create JSON schemas for validation
- Set up MCP server with proper transport

### Phase 2: Basic Calculations (Week 2)
- Implement rectangular placement algorithm
- Add basic die per wafer calculations
- Create validation logic
- Implement caching layer

### Phase 3: Advanced Features (Week 3)
- Add hexagonal placement algorithm
- Implement yield calculations
- Add cost calculations
- Create visualization module

### Phase 4: MCP Integration (Week 4)
- Implement all MCP tool handlers
- Add resource handlers for standard data
- Create prompt templates
- Complete error handling

### Phase 5: Testing & Documentation (Week 5)
- Write comprehensive unit tests
- Add integration tests
- Create E2E test scenarios
- Complete API documentation

### Phase 6: Production Features (Week 6)
- Add performance monitoring
- Implement rate limiting
- Add usage analytics
- Create deployment scripts

## Configuration Files

### package.json scripts
```json
{
  "scripts": {
    "build": "tsc",
    "dev": "ts-node-dev src/index.ts",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.ts",
    "validate": "npm run lint && npm run test",
    "benchmark": "ts-node scripts/benchmark.ts",
    "start": "node dist/index.js"
  }
}
```

## Validation Rules (Enhanced)
- **Wafer diameter**: Must be standard size (150, 200, 300, 450 mm)
- **Die dimensions**: 
  - Must be positive
  - Must be less than (wafer_diameter - 2 * edge_exclusion)
  - Minimum: 0.1 mm
- **Scribe lane**: 0.05-0.2 mm (industry standard range)
- **Edge exclusion**: 2-5 mm (depends on wafer size)

## Performance Requirements
- Response time: <100ms for single calculations
- Batch processing: <1s for 100 configurations
- Cache hit rate: >80% for common calculations
- Memory usage: <100MB under normal load

## Security Considerations
- Input sanitization for all parameters
- Rate limiting: 100 requests/minute per client
- Parameter validation against injection attacks
- Secure error messages (no internal details)

## Success Metrics
- Calculation accuracy: ±1 die tolerance
- Performance: 99% of requests under 100ms
- Availability: 99.9% uptime
- Test coverage: >95%
- Documentation completeness: 100%

## Example Usage (Enhanced)
```typescript
// Basic calculation with visualization
const result = await mcp.call('calculate_die_per_wafer', {
  wafer_diameter: 300,
  die_width: 10,
  die_height: 10,
  scribe_lane: 0.1,
  edge_exclusion: 3,
  algorithm: 'hexagonal',
  include_visualization: true
});

// Batch processing for optimization
const batch = await mcp.call('batch_calculate', {
  configurations: [
    { id: '1', calculation_type: 'die_per_wafer', parameters: {...} },
    { id: '2', calculation_type: 'yield', parameters: {...} }
  ],
  output_format: 'json'
});

// Multi-project wafer optimization
const mpw = await mcp.call('optimize_mpw', {
  projects: [
    { id: 'proj1', die_width: 5, die_height: 5, quantity: 10 },
    { id: 'proj2', die_width: 8, die_height: 8, quantity: 5 }
  ],
  optimization_strategy: 'maximize_dies'
});
```

## Future Enhancements
- GraphQL API for flexible querying
- WebAssembly module for performance-critical calculations
- Real-time collaboration features
- Integration with fab house APIs
- Machine learning for yield prediction
- 3D visualization of wafer utilization