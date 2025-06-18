import type { WaferDiameter, StandardWaferInfo } from '../calculations/types.js';

export const DEFAULT_SCRIBE_LANE = 0.1; // mm
export const DEFAULT_EDGE_EXCLUSION = 3; // mm
export const DEFAULT_ALPHA = 3; // Yield model clustering factor

export const SCRIBE_LANE_RANGE = {
  min: 0.05,
  max: 0.2,
} as const;

export const EDGE_EXCLUSION_RANGE = {
  min: 2,
  max: 5,
} as const;

export const DIE_SIZE_MIN = 0.1; // mm

export const STANDARD_WAFER_SIZES: Record<WaferDiameter, StandardWaferInfo> = {
  150: {
    diameter: 150,
    area: Math.PI * Math.pow(75, 2),
    typical_edge_exclusion: 3,
    common_applications: ['Legacy devices', 'Power semiconductors', 'MEMS'],
    typical_defect_density_range: {
      min: 0.1,
      max: 0.5,
      unit: 'defects/cm²',
    },
  },
  200: {
    diameter: 200,
    area: Math.PI * Math.pow(100, 2),
    typical_edge_exclusion: 3,
    common_applications: ['Analog/Mixed-signal', 'Power devices', 'Sensors'],
    typical_defect_density_range: {
      min: 0.05,
      max: 0.3,
      unit: 'defects/cm²',
    },
  },
  300: {
    diameter: 300,
    area: Math.PI * Math.pow(150, 2),
    typical_edge_exclusion: 3,
    common_applications: ['Logic', 'Memory', 'Processors', 'GPUs'],
    typical_defect_density_range: {
      min: 0.01,
      max: 0.1,
      unit: 'defects/cm²',
    },
  },
  450: {
    diameter: 450,
    area: Math.PI * Math.pow(225, 2),
    typical_edge_exclusion: 5,
    common_applications: ['Advanced logic', 'Next-gen memory', 'Research'],
    typical_defect_density_range: {
      min: 0.005,
      max: 0.05,
      unit: 'defects/cm²',
    },
  },
};

export const CACHE_CONFIG = {
  ttl: 3600, // 1 hour in seconds
  maxSize: 1000, // Maximum number of cached calculations
  checkPeriod: 600, // Check for expired entries every 10 minutes
} as const;

export const PERFORMANCE_TARGETS = {
  singleCalculation: 100, // ms
  batchProcessing: 1000, // ms for 100 items
  cacheHitRate: 0.8, // 80%
} as const;