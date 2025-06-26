import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { readFile, readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { existsSync } from 'fs';
import { logger } from '../utils/logger.js';

export interface KLayoutResource extends Resource {
  metadata?: {
    format?: string;
    cellCount?: number;
    topCells?: string[];
    fileSize?: number;
    lastModified?: string;
  };
}

export class ResourceManager {
  private layoutDirectories: string[];

  constructor() {
    // Default layout directories from environment or common locations
    const envDirs = process.env.KLAYOUT_LAYOUT_DIRS?.split(':') || [];
    this.layoutDirectories = [
      ...envDirs,
      process.cwd(),
      join(process.cwd(), 'layouts'),
      join(process.cwd(), 'gds'),
      join(process.cwd(), 'designs'),
    ].filter(dir => existsSync(dir));
  }

  async listResources(): Promise<KLayoutResource[]> {
    const resources: KLayoutResource[] = [];

    // Add example resources
    resources.push(...this.getExampleResources());

    // Scan directories for layout files
    for (const dir of this.layoutDirectories) {
      try {
        const dirResources = await this.scanDirectory(dir);
        resources.push(...dirResources);
      } catch (error) {
        logger.debug(`Failed to scan directory ${dir}:`, error);
      }
    }

    // Add script resources
    resources.push(...this.getScriptResources());

    return resources;
  }

  async readResource(uri: string): Promise<string> {
    // Handle different resource types
    if (uri.startsWith('klayout://examples/')) {
      return this.readExampleResource(uri);
    }

    if (uri.startsWith('klayout://scripts/')) {
      return this.readScriptResource(uri);
    }

    if (uri.startsWith('klayout://layouts/')) {
      return this.readLayoutResource(uri);
    }

    if (uri.startsWith('file://')) {
      const filePath = uri.substring(7);
      return this.readFileResource(filePath);
    }

    throw new Error(`Unknown resource URI: ${uri}`);
  }

  private getExampleResources(): KLayoutResource[] {
    return [
      {
        uri: 'klayout://examples/simple_drc.rb',
        name: 'Simple DRC Rules Example',
        description: 'Basic DRC rules demonstrating metal and via checks',
        mimeType: 'text/x-ruby',
      },
      {
        uri: 'klayout://examples/layer_density.py',
        name: 'Layer Density Calculator',
        description: 'Python script to calculate layer density and statistics',
        mimeType: 'text/x-python',
      },
      {
        uri: 'klayout://examples/convert_formats.py',
        name: 'Batch Format Converter',
        description: 'Convert multiple layout files between formats',
        mimeType: 'text/x-python',
      },
      {
        uri: 'klayout://examples/extract_top_metal.rb',
        name: 'Top Metal Extractor',
        description: 'Extract top metal layers for review',
        mimeType: 'text/x-ruby',
      },
    ];
  }

  private getScriptResources(): KLayoutResource[] {
    return [
      {
        uri: 'klayout://scripts/measure_dimensions.py',
        name: 'Dimension Measurement Script',
        description: 'Measure distances and areas in layouts',
        mimeType: 'text/x-python',
      },
      {
        uri: 'klayout://scripts/generate_fill.rb',
        name: 'Fill Pattern Generator',
        description: 'Generate dummy fill patterns for density requirements',
        mimeType: 'text/x-ruby',
      },
      {
        uri: 'klayout://scripts/hierarchy_analyzer.py',
        name: 'Hierarchy Analyzer',
        description: 'Analyze and visualize cell hierarchy',
        mimeType: 'text/x-python',
      },
    ];
  }

  private async scanDirectory(dir: string): Promise<KLayoutResource[]> {
    const resources: KLayoutResource[] = [];
    const supportedExtensions = ['.gds', '.gds2', '.oas', '.oasis', '.dxf', '.cif', '.mag'];

    try {
      const files = await readdir(dir);
      
      for (const file of files) {
        const ext = extname(file).toLowerCase();
        if (supportedExtensions.includes(ext)) {
          const fullPath = join(dir, file);
          const stats = await stat(fullPath);
          
          resources.push({
            uri: `file://${fullPath}`,
            name: basename(file),
            description: `${this.getFormatName(ext)} layout file`,
            mimeType: this.getMimeType(ext),
            metadata: {
              format: ext.substring(1),
              fileSize: stats.size,
              lastModified: stats.mtime.toISOString(),
            },
          });
        }
      }
    } catch (error) {
      logger.debug(`Error scanning directory ${dir}:`, error);
    }

    return resources;
  }

  private async readExampleResource(uri: string): Promise<string> {
    const examples: Record<string, string> = {
      'klayout://examples/simple_drc.rb': await readFile(join(__dirname, '../../examples/simple_drc.rb'), 'utf8'),
      'klayout://examples/layer_density.py': await readFile(join(__dirname, '../../examples/layer_density.py'), 'utf8'),
      'klayout://examples/convert_formats.py': `# Batch format converter example
import pya
import os
import glob

# Find all GDS files in current directory
gds_files = glob.glob("*.gds")

for gds_file in gds_files:
    print(f"Converting {gds_file}...")
    
    # Load layout
    layout = pya.Layout()
    layout.read(gds_file)
    
    # Convert to OASIS
    oas_file = gds_file.replace('.gds', '.oas')
    layout.write(oas_file)
    
    print(f"  Created {oas_file}")
    
    # Get file sizes for comparison
    gds_size = os.path.getsize(gds_file)
    oas_size = os.path.getsize(oas_file)
    compression = (1 - oas_size/gds_size) * 100
    
    print(f"  Compression: {compression:.1f}%")
`,
      'klayout://examples/extract_top_metal.rb': `# Extract top metal layers
# Define top metal layers
top_metals = [33, 34]  # Adjust for your process

# Load layout
layout = RBA::Layout.new
layout.read($input_file)

# Create output layout
output = RBA::Layout.new
output.dbu = layout.dbu

# Copy top metal layers
layout.layer_indices.each do |idx|
  info = layout.get_info(idx)
  if top_metals.include?(info.layer)
    output.layer(info.layer, info.datatype)
    
    layout.each_cell do |cell|
      out_cell = output.cell(cell.name) || output.create_cell(cell.name)
      cell.shapes(idx).each do |shape|
        out_cell.shapes(idx).insert(shape)
      end
    end
  end
end

# Write output
output.write($output_file || "top_metal.gds")
`,
    };

    const content = examples[uri];
    if (!content) {
      throw new Error(`Example resource not found: ${uri}`);
    }
    return content;
  }

  private async readScriptResource(uri: string): Promise<string> {
    const scripts: Record<string, string> = {
      'klayout://scripts/measure_dimensions.py': `# Measure dimensions in layout
import pya

def measure_bbox(cell):
    """Measure bounding box dimensions of a cell"""
    bbox = cell.bbox()
    width = bbox.width() / 1000.0  # Convert to microns
    height = bbox.height() / 1000.0
    area = width * height
    
    print(f"Cell: {cell.name}")
    print(f"  Width: {width:.3f} µm")
    print(f"  Height: {height:.3f} µm")
    print(f"  Area: {area:.3f} µm²")
    print(f"  Aspect ratio: {width/height:.3f}")

# Load layout
layout = pya.Layout()
layout.read($input_file)

# Measure all top cells
for cell in layout.top_cells():
    measure_bbox(cell)
`,
      'klayout://scripts/generate_fill.rb': `# Generate dummy fill patterns
# Parameters
fill_size = 1.0  # Fill square size in microns
fill_space = 0.5  # Spacing between fill squares
fill_layer = 99  # Layer for fill patterns

# Create fill in given region
def create_fill(cell, region, layer_index)
  dbu = cell.layout.dbu
  fill_size_dbu = (fill_size / dbu).to_i
  fill_space_dbu = (fill_space / dbu).to_i
  step = fill_size_dbu + fill_space_dbu
  
  # Generate fill array
  region.bbox.each_point(step, step) do |x, y|
    box = RBA::Box.new(x, y, x + fill_size_dbu, y + fill_size_dbu)
    if region.contains?(box)
      cell.shapes(layer_index).insert(box)
    end
  end
end
`,
      'klayout://scripts/hierarchy_analyzer.py': `# Analyze cell hierarchy
import pya

def analyze_hierarchy(cell, indent=0):
    """Recursively analyze cell hierarchy"""
    prefix = "  " * indent
    
    # Count shapes
    total_shapes = 0
    for layer_idx in cell.layout().layer_indices():
        total_shapes += cell.shapes(layer_idx).size()
    
    # Print cell info
    print(f"{prefix}{cell.name}")
    print(f"{prefix}  Shapes: {total_shapes}")
    print(f"{prefix}  Instances: {cell.child_instances()}")
    
    # Analyze child cells
    for inst in cell.each_inst():
        child_cell = cell.layout().cell(inst.cell_index)
        analyze_hierarchy(child_cell, indent + 1)

# Load and analyze
layout = pya.Layout()
layout.read($input_file)

print("Cell Hierarchy Analysis")
print("=" * 50)

for top_cell in layout.top_cells():
    analyze_hierarchy(top_cell)
`,
    };

    const content = scripts[uri];
    if (!content) {
      throw new Error(`Script resource not found: ${uri}`);
    }
    return content;
  }

  private async readLayoutResource(uri: string): Promise<string> {
    const path = uri.replace('klayout://layouts/', '');
    const fullPath = join(this.layoutDirectories[0], path);
    
    if (!existsSync(fullPath)) {
      throw new Error(`Layout file not found: ${fullPath}`);
    }

    // For layout files, return metadata instead of binary content
    const stats = await stat(fullPath);
    return JSON.stringify({
      type: 'layout_file',
      path: fullPath,
      format: extname(fullPath).substring(1),
      size: stats.size,
      modified: stats.mtime.toISOString(),
      hint: 'Use klayout_layout_info tool to analyze this file',
    }, null, 2);
  }

  private async readFileResource(filePath: string): Promise<string> {
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const ext = extname(filePath).toLowerCase();
    
    // For binary layout files, return metadata
    if (['.gds', '.gds2', '.oas', '.oasis'].includes(ext)) {
      const stats = await stat(filePath);
      return JSON.stringify({
        type: 'layout_file',
        path: filePath,
        format: ext.substring(1),
        size: stats.size,
        modified: stats.mtime.toISOString(),
        hint: 'Use klayout_layout_info tool to analyze this file',
      }, null, 2);
    }

    // For text files, return content
    return readFile(filePath, 'utf8');
  }

  private getFormatName(ext: string): string {
    const formats: Record<string, string> = {
      '.gds': 'GDSII',
      '.gds2': 'GDSII',
      '.oas': 'OASIS',
      '.oasis': 'OASIS',
      '.dxf': 'DXF',
      '.cif': 'CIF',
      '.mag': 'Magic',
    };
    return formats[ext] || 'Layout';
  }

  private getMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
      '.gds': 'application/x-gds',
      '.gds2': 'application/x-gds',
      '.oas': 'application/x-oasis',
      '.oasis': 'application/x-oasis',
      '.dxf': 'application/dxf',
      '.cif': 'application/x-cif',
      '.mag': 'application/x-magic',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}