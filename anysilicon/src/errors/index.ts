export class AnySiliconError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    // Only use captureStackTrace if available (V8 engines)
    if ('captureStackTrace' in Error && typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class ValidationError extends AnySiliconError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

export class CalculationError extends AnySiliconError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CALCULATION_ERROR', details);
  }
}

export class ConfigurationError extends AnySiliconError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFIGURATION_ERROR', details);
  }
}

export class NotImplementedError extends AnySiliconError {
  constructor(feature: string) {
    super(`Feature not implemented: ${feature}`, 'NOT_IMPLEMENTED', { feature });
  }
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}