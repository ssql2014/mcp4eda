export interface IpVendor {
  name: string;
  company: string;
  category: string;
  subcategory: string;
  description: string;
  processNodes?: string[];
  features?: string[];
  website?: string;
  contact?: string;
}

export interface AsicService {
  provider: string;
  serviceType: string;
  technology?: string;
  description: string;
  capabilities?: string[];
  website?: string;
  contact?: string;
}

export interface PriceEstimation {
  service: string;
  parameters: Record<string, any>;
  estimatedCost?: {
    min: number;
    max: number;
    currency: string;
  };
  breakdown?: Record<string, number>;
  notes?: string[];
}

export interface VendorComparison {
  vendors: Array<IpVendor | AsicService>;
  criteria: string[];
  comparison: Record<string, Record<string, any>>;
  recommendation?: string;
}

export interface SearchQuery {
  category?: string;
  subcategory?: string;
  keywords?: string[];
  processNode?: string;
  powerRequirement?: string;
  foundry?: string;
  limit?: number;
}