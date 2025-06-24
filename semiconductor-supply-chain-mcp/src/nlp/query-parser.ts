import { IntentRecognizer, Intent } from './intent-recognizer.js';

export interface ParsedQuery {
  originalQuery: string;
  intent: Intent;
  toolName: string;
  parameters: Record<string, any>;
}

export class QueryParser {
  private intentRecognizer: IntentRecognizer;

  constructor() {
    this.intentRecognizer = new IntentRecognizer();
  }

  parseQuery(query: string): ParsedQuery {
    const intent = this.intentRecognizer.recognizeIntent(query);
    const toolName = this.mapIntentToTool(intent.type);
    const parameters = this.buildParameters(intent);

    return {
      originalQuery: query,
      intent,
      toolName,
      parameters
    };
  }

  private mapIntentToTool(intentType: Intent['type']): string {
    const toolMapping: Record<Intent['type'], string> = {
      'find_ip': 'find_ip_vendors',
      'find_asic': 'find_asic_services',
      'estimate_price': 'get_price_estimation',
      'compare': 'compare_vendors',
      'unknown': ''
    };
    return toolMapping[intentType];
  }

  private buildParameters(intent: Intent): Record<string, any> {
    const { entities } = intent;
    const params: Record<string, any> = {};

    switch (intent.type) {
      case 'find_ip':
        if (entities.category) params.category = entities.category;
        if (entities.subcategory) params.subcategory = entities.subcategory;
        if (entities.processNode) params.processNode = entities.processNode;
        break;

      case 'find_asic':
        if (entities.serviceType) params.serviceType = entities.serviceType;
        if (entities.technology) params.technology = entities.technology;
        if (entities.processNode) params.processNode = entities.processNode;
        break;

      case 'estimate_price':
        if (entities.priceType) {
          params.type = entities.priceType;
          if (entities.processNode) params.processNode = entities.processNode;
          // Default complexity for ASIC NRE
          if (entities.priceType === 'asic_nre') {
            params.complexity = 'medium';
          }
        }
        break;

      case 'compare':
        if (entities.vendors && entities.vendors.length > 0) {
          params.vendors = entities.vendors;
        }
        break;
    }

    return params;
  }

  generateSuggestions(intent: Intent): string[] {
    const suggestions: string[] = [];

    if (intent.type === 'unknown' || intent.confidence < 0.5) {
      suggestions.push(
        "I couldn't understand your query clearly. Here are some examples:",
        "- Find DDR5 PHY IP vendors for 7nm process",
        "- Show ASIC verification services",
        "- Estimate NRE cost for 5nm ASIC",
        "- Compare TSMC vs Samsung foundry services"
      );
    } else {
      const missingParams = this.identifyMissingParameters(intent);
      if (missingParams.length > 0) {
        suggestions.push(`To refine your search, you might want to specify:`);
        missingParams.forEach(param => suggestions.push(`- ${param}`));
      }
    }

    return suggestions;
  }

  private identifyMissingParameters(intent: Intent): string[] {
    const missing: string[] = [];
    const { entities } = intent;

    switch (intent.type) {
      case 'find_ip':
        if (!entities.category) missing.push('IP category (e.g., Interface, Memory, Processor)');
        if (!entities.processNode) missing.push('Process node (e.g., 7nm, 5nm)');
        break;

      case 'find_asic':
        if (!entities.serviceType) missing.push('Service type (e.g., design, verification, manufacturing)');
        if (!entities.technology) missing.push('Technology or process node');
        break;

      case 'estimate_price':
        if (!entities.priceType) missing.push('What to estimate (e.g., ASIC NRE, mask cost, IP licensing)');
        if (!entities.processNode) missing.push('Process node');
        break;

      case 'compare':
        if (!entities.vendors || entities.vendors.length < 2) {
          missing.push('At least two vendors to compare');
        }
        break;
    }

    return missing;
  }
}