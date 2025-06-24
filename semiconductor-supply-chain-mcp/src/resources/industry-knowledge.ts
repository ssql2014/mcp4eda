export interface IndustryKnowledge {
  category: string;
  subcategory: string;
  description: string;
  commonVendors: string[];
  typicalApplications: string[];
  keyConsiderations: string[];
}

export const industryKnowledgeBase: IndustryKnowledge[] = [
  // Interface IPs
  {
    category: "Interface",
    subcategory: "DDR PHY",
    description: "DDR memory interface physical layer IP",
    commonVendors: ["Synopsys", "Cadence", "Rambus", "Northwest Logic"],
    typicalApplications: ["SoCs", "Application Processors", "AI Accelerators", "Network Processors"],
    keyConsiderations: ["Data rate support", "Power consumption", "Area efficiency", "DFI compliance"]
  },
  {
    category: "Interface", 
    subcategory: "PCIe Controller",
    description: "PCI Express interface controller with PHY",
    commonVendors: ["Synopsys", "Cadence", "PLDA", "Northwest Logic"],
    typicalApplications: ["Data center", "Storage", "GPU cards", "Network cards"],
    keyConsiderations: ["Gen support (3.0/4.0/5.0/6.0)", "Lane configuration", "SR-IOV support"]
  },
  {
    category: "Interface",
    subcategory: "Ethernet MAC/PHY",
    description: "Ethernet media access controller and physical layer",
    commonVendors: ["Synopsys", "Cadence", "Marvell", "Broadcom"],
    typicalApplications: ["Networking equipment", "Data centers", "Automotive", "Industrial"],
    keyConsiderations: ["Speed grades (1G/10G/25G/100G)", "IEEE compliance", "TSN support"]
  },

  // Memory IPs
  {
    category: "Memory",
    subcategory: "SRAM Compiler",
    description: "Static RAM memory compiler for on-chip memory",
    commonVendors: ["ARM", "Synopsys", "Cadence", "Dolphin"],
    typicalApplications: ["Cache memory", "Buffers", "Register files", "FIFO"],
    keyConsiderations: ["Density range", "Access time", "Power modes", "Redundancy options"]
  },

  // Processor IPs
  {
    category: "Processor",
    subcategory: "RISC-V Core",
    description: "Open-source RISC-V processor cores",
    commonVendors: ["SiFive", "Andes", "Codasip", "OpenHW Group"],
    typicalApplications: ["IoT devices", "Edge AI", "Microcontrollers", "Application processors"],
    keyConsiderations: ["ISA extensions", "Performance tier", "Security features", "Debug support"]
  },

  // ASIC Services
  {
    category: "ASIC Service",
    subcategory: "RTL Design",
    description: "Front-end ASIC design services",
    commonVendors: ["eInfochips", "HCL", "Wipro", "TCS"],
    typicalApplications: ["Custom chip development", "IP integration", "Architecture design"],
    keyConsiderations: ["Domain expertise", "Tool access", "Design methodology", "IP portfolio"]
  },
  {
    category: "ASIC Service",
    subcategory: "Physical Design",
    description: "Back-end ASIC implementation services",
    commonVendors: ["GUC", "Faraday", "VeriSilicon", "eInfochips"],
    typicalApplications: ["Place and route", "Timing closure", "Physical verification"],
    keyConsiderations: ["Process node experience", "Foundry relationships", "Turnaround time"]
  }
];

export interface ProcessNodeInfo {
  node: string;
  foundries: string[];
  typicalApplications: string[];
  characteristics: {
    transistorDensity: string;
    powerReduction: string;
    performanceGain: string;
  };
  maturity: 'emerging' | 'production' | 'mature';
}

export const processNodeDatabase: ProcessNodeInfo[] = [
  {
    node: "3nm",
    foundries: ["TSMC", "Samsung"],
    typicalApplications: ["Mobile processors", "AI accelerators", "High-end GPUs"],
    characteristics: {
      transistorDensity: "~300M transistors/mm²",
      powerReduction: "30% vs 5nm",
      performanceGain: "15% vs 5nm"
    },
    maturity: "production"
  },
  {
    node: "5nm",
    foundries: ["TSMC", "Samsung"],
    typicalApplications: ["Smartphones", "Data center", "AI chips"],
    characteristics: {
      transistorDensity: "~170M transistors/mm²",
      powerReduction: "30% vs 7nm",
      performanceGain: "15% vs 7nm"
    },
    maturity: "mature"
  },
  {
    node: "7nm",
    foundries: ["TSMC", "Samsung", "Intel"],
    typicalApplications: ["CPUs", "GPUs", "Mobile SoCs", "FPGAs"],
    characteristics: {
      transistorDensity: "~100M transistors/mm²",
      powerReduction: "40% vs 10nm",
      performanceGain: "20% vs 10nm"
    },
    maturity: "mature"
  },
  {
    node: "14nm/16nm",
    foundries: ["TSMC", "Samsung", "GlobalFoundries", "Intel", "SMIC"],
    typicalApplications: ["Mid-range processors", "Automotive", "IoT"],
    characteristics: {
      transistorDensity: "~35M transistors/mm²",
      powerReduction: "50% vs 28nm",
      performanceGain: "30% vs 28nm"
    },
    maturity: "mature"
  },
  {
    node: "28nm",
    foundries: ["TSMC", "Samsung", "GlobalFoundries", "SMIC", "UMC"],
    typicalApplications: ["MCUs", "RF", "Automotive", "Industrial"],
    characteristics: {
      transistorDensity: "~10M transistors/mm²",
      powerReduction: "30% vs 40nm",
      performanceGain: "20% vs 40nm"
    },
    maturity: "mature"
  }
];

export function getVendorsByCategory(category: string, subcategory?: string): string[] {
  const filtered = industryKnowledgeBase.filter(item => 
    item.category === category && 
    (!subcategory || item.subcategory === subcategory)
  );
  
  const vendors = new Set<string>();
  filtered.forEach(item => {
    item.commonVendors.forEach(vendor => vendors.add(vendor));
  });
  
  return Array.from(vendors);
}

export function getProcessNodeInfo(node: string): ProcessNodeInfo | undefined {
  return processNodeDatabase.find(info => info.node === node);
}

export function getApplicationsByProcessNode(node: string): string[] {
  const info = processNodeDatabase.find(info => info.node === node);
  return info?.typicalApplications || [];
}