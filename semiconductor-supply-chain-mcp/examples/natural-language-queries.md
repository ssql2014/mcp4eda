# Natural Language Query Examples

This document provides examples of natural language queries that can be processed by the semiconductor supply chain MCP server.

## IP Core Queries

### Finding IP Vendors
- "Find DDR5 PHY IP vendors for 7nm process"
- "Show me USB 3.0 IP cores"
- "I need PCIe 5.0 controller IP"
- "List memory interface IPs for 5nm"
- "Find Ethernet PHY vendors"

### Specific Technology Queries
- "Show 10G Ethernet MAC IP vendors"
- "Find RISC-V processor cores"
- "I need high-speed SerDes IP for 7nm"
- "List DDR4 memory controller vendors"

## ASIC Service Queries

### Design Services
- "Find ASIC design services"
- "Show RTL design companies"
- "I need frontend design services for 5nm"
- "List ASIC architecture services"

### Verification Services
- "Find verification services for 7nm designs"
- "Show ASIC validation companies"
- "I need DV services for my chip"
- "List functional verification vendors"

### Manufacturing Services
- "Find tape-out services"
- "Show ASIC manufacturing companies"
- "I need backend design services"
- "List physical design service providers"

## Price Estimation Queries

### NRE Costs
- "Estimate ASIC NRE cost for 7nm"
- "What's the NRE for a 5nm high-complexity design?"
- "Calculate ASIC development cost for 14nm"
- "Estimate NRE for medium complexity chip at 7nm"

### Mask Costs
- "What's the mask cost for 5nm?"
- "Estimate mask set price for 7nm process"
- "Calculate mask costs for 14nm"

### IP Licensing
- "Estimate IP licensing cost for DDR5 PHY"
- "What's the typical licensing fee for PCIe IP?"
- "Calculate IP costs for a complete interface suite"

## Vendor Comparison Queries

### Foundry Comparisons
- "Compare TSMC vs Samsung foundry services"
- "Which is better: TSMC or GlobalFoundries for 14nm?"
- "Compare Intel vs TSMC for advanced nodes"

### IP Vendor Comparisons
- "Compare Synopsys vs Cadence IP offerings"
- "Which vendor has better DDR IP: Synopsys or Rambus?"
- "Compare IP vendors for PCIe solutions"

## Complex Queries

### Multi-criteria Searches
- "Find DDR5 IP vendors that support 7nm TSMC process with low power options"
- "Show ASIC services for AI chip design with 5nm experience"
- "I need verification services specializing in high-speed interfaces for 7nm"

### Project-based Queries
- "I'm designing an AI accelerator at 7nm, what services do I need?"
- "Help me find vendors for a complete networking chip solution"
- "What's needed for a 5nm mobile processor project?"

## Query Tips

1. **Be specific about technology**: Mention specific standards (DDR5, PCIe 5.0, etc.)
2. **Include process node**: Specify the target process (7nm, 5nm, etc.)
3. **Mention requirements**: Add constraints like "low power" or "high performance"
4. **Use industry terms**: The system understands standard semiconductor terminology

## Supported Intent Types

The natural language processor can understand:
- **find_ip**: Queries about IP cores and vendors
- **find_asic**: Queries about ASIC services
- **estimate_price**: Cost and pricing queries
- **compare**: Vendor or technology comparisons

## Response Format

Responses include:
- Original query interpretation
- Confidence level in understanding
- Extracted parameters
- Results from the appropriate tool
- Suggestions for query improvement (if needed)