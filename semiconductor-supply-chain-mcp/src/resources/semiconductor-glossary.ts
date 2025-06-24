export interface GlossaryEntry {
  term: string;
  definition: string;
  category: string;
  relatedTerms?: string[];
}

export const semiconductorGlossary: GlossaryEntry[] = [
  // IP Core Terms
  {
    term: "IP Core",
    definition: "Pre-designed and pre-verified building blocks used in chip design",
    category: "IP",
    relatedTerms: ["Soft IP", "Hard IP", "Firm IP"]
  },
  {
    term: "PHY",
    definition: "Physical Layer - the circuitry required to support a physical connection to an external device",
    category: "IP",
    relatedTerms: ["SerDes", "DDR PHY", "PCIe PHY"]
  },
  {
    term: "SerDes",
    definition: "Serializer/Deserializer - converts parallel data to serial data and vice versa",
    category: "IP",
    relatedTerms: ["PHY", "High-speed interface"]
  },
  
  // Process Technology Terms
  {
    term: "Process Node",
    definition: "The manufacturing technology used to build semiconductors, measured in nanometers",
    category: "Manufacturing",
    relatedTerms: ["7nm", "5nm", "FinFET"]
  },
  {
    term: "FinFET",
    definition: "Fin Field-Effect Transistor - a 3D transistor architecture",
    category: "Manufacturing",
    relatedTerms: ["Process Node", "Planar", "GAA"]
  },
  {
    term: "NRE",
    definition: "Non-Recurring Engineering - one-time costs for designing and developing a chip",
    category: "Cost",
    relatedTerms: ["Mask cost", "Design cost"]
  },
  
  // ASIC Terms
  {
    term: "ASIC",
    definition: "Application-Specific Integrated Circuit - a chip designed for a specific application",
    category: "Design",
    relatedTerms: ["Full custom", "Semi-custom", "FPGA"]
  },
  {
    term: "RTL",
    definition: "Register Transfer Level - a design abstraction for digital circuits",
    category: "Design",
    relatedTerms: ["Verilog", "VHDL", "SystemVerilog"]
  },
  {
    term: "Tape-out",
    definition: "The final stage of chip design before manufacturing",
    category: "Design",
    relatedTerms: ["GDSII", "Sign-off", "Mask"]
  },
  
  // Foundry Terms
  {
    term: "Foundry",
    definition: "A semiconductor fabrication plant that manufactures chips",
    category: "Manufacturing",
    relatedTerms: ["TSMC", "Samsung", "GlobalFoundries"]
  },
  {
    term: "PDK",
    definition: "Process Design Kit - files and documentation for a specific manufacturing process",
    category: "Manufacturing",
    relatedTerms: ["Design rules", "Standard cells"]
  },
  {
    term: "MPW",
    definition: "Multi-Project Wafer - sharing mask and wafer costs across multiple designs",
    category: "Manufacturing",
    relatedTerms: ["Shuttle run", "Prototyping"]
  }
];

export const categoryDescriptions: Record<string, string> = {
  "IP": "Intellectual Property cores and reusable design blocks",
  "Manufacturing": "Semiconductor fabrication and process technology",
  "Design": "Chip design methodology and flow",
  "Cost": "Financial aspects of semiconductor development",
  "Verification": "Testing and validation of chip designs"
};

export function searchGlossary(searchTerm: string): GlossaryEntry[] {
  const lowercaseSearch = searchTerm.toLowerCase();
  return semiconductorGlossary.filter(entry => 
    entry.term.toLowerCase().includes(lowercaseSearch) ||
    entry.definition.toLowerCase().includes(lowercaseSearch) ||
    entry.relatedTerms?.some(term => term.toLowerCase().includes(lowercaseSearch))
  );
}

export function getTermsByCategory(category: string): GlossaryEntry[] {
  return semiconductorGlossary.filter(entry => 
    entry.category.toLowerCase() === category.toLowerCase()
  );
}