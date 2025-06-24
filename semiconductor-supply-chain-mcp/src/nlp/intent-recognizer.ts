import { z } from 'zod';

export interface Intent {
  type: 'find_ip' | 'find_asic' | 'estimate_price' | 'compare' | 'unknown';
  entities: Record<string, any>;
  confidence: number;
}

export interface EntityExtraction {
  category?: string;
  subcategory?: string;
  processNode?: string;
  serviceType?: string;
  technology?: string;
  priceType?: string;
  vendors?: string[];
}

export class IntentRecognizer {
  private ipKeywords = [
    'ip', 'ip core', 'intellectual property', 'phy', 'controller', 
    'interface', 'ddr', 'pcie', 'usb', 'ethernet', 'serdes'
  ];

  private asicKeywords = [
    'asic', 'design service', 'verification', 'manufacturing', 
    'tape-out', 'rtl', 'synthesis', 'backend', 'physical design'
  ];

  private priceKeywords = [
    'price', 'cost', 'estimate', 'nre', 'mask', 'licensing', 
    'budget', 'quote', 'fee', 'expense'
  ];

  private compareKeywords = [
    'compare', 'versus', 'vs', 'comparison', 'difference', 
    'better', 'choose', 'select', 'which'
  ];

  private processNodes = [
    '3nm', '5nm', '7nm', '10nm', '14nm', '16nm', '22nm', 
    '28nm', '40nm', '65nm', '90nm', '130nm'
  ];

  recognizeIntent(query: string): Intent {
    const lowerQuery = query.toLowerCase();
    
    // Score each intent type
    const scores = {
      find_ip: this.scoreIntent(lowerQuery, this.ipKeywords),
      find_asic: this.scoreIntent(lowerQuery, this.asicKeywords),
      estimate_price: this.scoreIntent(lowerQuery, this.priceKeywords),
      compare: this.scoreIntent(lowerQuery, this.compareKeywords)
    };

    // Find the highest scoring intent
    let maxScore = 0;
    let intentType: Intent['type'] = 'unknown';
    
    for (const [type, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        intentType = type as Intent['type'];
      }
    }

    // Extract entities based on intent
    const entities = this.extractEntities(query, intentType);

    return {
      type: intentType,
      entities,
      confidence: maxScore
    };
  }

  private scoreIntent(query: string, keywords: string[]): number {
    let score = 0;
    for (const keyword of keywords) {
      if (query.includes(keyword)) {
        score += keyword.split(' ').length; // Multi-word keywords get higher score
      }
    }
    return score / keywords.length; // Normalize by keyword count
  }

  extractEntities(query: string, intentType: Intent['type']): EntityExtraction {
    const entities: EntityExtraction = {};
    const lowerQuery = query.toLowerCase();

    // Extract process node
    for (const node of this.processNodes) {
      if (lowerQuery.includes(node)) {
        entities.processNode = node;
        break;
      }
    }

    // Extract categories based on intent
    if (intentType === 'find_ip') {
      entities.category = this.extractIpCategory(lowerQuery);
      entities.subcategory = this.extractIpSubcategory(lowerQuery);
    } else if (intentType === 'find_asic') {
      entities.serviceType = this.extractAsicService(lowerQuery);
      entities.technology = this.extractTechnology(lowerQuery);
    } else if (intentType === 'estimate_price') {
      entities.priceType = this.extractPriceType(lowerQuery);
    }

    // Extract vendor names (simple pattern matching)
    const vendorPatterns = /\b(tsmc|samsung|intel|globalfoundries|smic|cadence|synopsys|mentor)\b/gi;
    const vendors = lowerQuery.match(vendorPatterns);
    if (vendors) {
      entities.vendors = [...new Set(vendors)];
    }

    return entities;
  }

  private extractIpCategory(query: string): string | undefined {
    const categories: Record<string, string[]> = {
      'Interface': ['ddr', 'pcie', 'usb', 'ethernet', 'sata', 'hdmi', 'displayport'],
      'Memory': ['sram', 'dram', 'flash', 'rom', 'memory controller'],
      'Processor': ['cpu', 'gpu', 'dsp', 'microcontroller', 'processor'],
      'Analog': ['adc', 'dac', 'pll', 'analog', 'mixed signal'],
      'Security': ['crypto', 'security', 'encryption', 'authentication']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      for (const keyword of keywords) {
        if (query.includes(keyword)) {
          return category;
        }
      }
    }
    return undefined;
  }

  private extractIpSubcategory(query: string): string | undefined {
    const subcategories: Record<string, string> = {
      'ddr5': 'DDR5 PHY',
      'ddr4': 'DDR4 PHY',
      'pcie5': 'PCIe 5.0',
      'pcie4': 'PCIe 4.0',
      'usb3': 'USB 3.x',
      'ethernet 10g': '10G Ethernet',
      'ethernet 100g': '100G Ethernet'
    };

    for (const [pattern, subcategory] of Object.entries(subcategories)) {
      if (query.includes(pattern)) {
        return subcategory;
      }
    }
    return undefined;
  }

  private extractAsicService(query: string): string | undefined {
    const services: Record<string, string[]> = {
      'design': ['design', 'rtl', 'architecture', 'frontend'],
      'verification': ['verification', 'validation', 'test', 'dv'],
      'physical': ['physical design', 'backend', 'layout', 'pnr'],
      'manufacturing': ['manufacturing', 'fabrication', 'tape-out', 'production']
    };

    for (const [service, keywords] of Object.entries(services)) {
      for (const keyword of keywords) {
        if (query.includes(keyword)) {
          return service;
        }
      }
    }
    return undefined;
  }

  private extractTechnology(query: string): string | undefined {
    const technologies = [
      'finfet', 'planar', 'soi', 'bulk cmos', 'bicmos', 
      'gan', 'sige', 'inp'
    ];

    for (const tech of technologies) {
      if (query.includes(tech)) {
        return tech;
      }
    }
    return undefined;
  }

  private extractPriceType(query: string): string | undefined {
    if (query.includes('nre')) return 'nre';
    if (query.includes('mask')) return 'mask';
    if (query.includes('licens') || query.includes('license')) return 'licensing';
    if (query.includes('asic')) return 'asic_nre';
    return undefined;
  }
}