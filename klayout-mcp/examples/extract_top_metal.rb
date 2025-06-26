# Extract top metal layers from layout
# This script extracts the top metal layers (typically used for routing and power)

# Configuration - adjust for your process
top_metal_layers = [
  [33, 0],  # Metal 9
  [34, 0],  # Metal 10
  [35, 0],  # Via 9
  [45, 0],  # RDL (if present)
]

# Load input layout
input_file = $input_file || "design.gds"
output_file = $output_file || "top_metal_extracted.gds"

puts "Extracting top metal layers from: #{input_file}"

# Create layout objects
input_layout = RBA::Layout.new
input_layout.read(input_file)

output_layout = RBA::Layout.new
output_layout.dbu = input_layout.dbu

# Create layer mapping
layer_map = {}
top_metal_layers.each do |layer, datatype|
  input_idx = input_layout.layer(layer, datatype)
  output_idx = output_layout.layer(layer, datatype)
  layer_map[input_idx] = output_idx
  
  # Copy layer properties if they exist
  info = input_layout.get_info(input_idx)
  if info
    output_layout.set_info(output_idx, info)
  end
end

# Copy cells and shapes
cell_map = {}

# First pass: create all cells
input_layout.each_cell do |input_cell|
  output_cell = output_layout.create_cell(input_cell.name)
  cell_map[input_cell.cell_index] = output_cell
end

# Second pass: copy shapes and instances
input_layout.each_cell do |input_cell|
  output_cell = cell_map[input_cell.cell_index]
  
  # Copy shapes on top metal layers
  layer_map.each do |input_idx, output_idx|
    input_cell.shapes(input_idx).each do |shape|
      output_cell.shapes(output_idx).insert(shape)
    end
  end
  
  # Copy cell instances to maintain hierarchy
  input_cell.each_inst do |inst|
    child_output_cell = cell_map[inst.cell_index]
    if child_output_cell
      output_cell.insert(RBA::CellInstArray.new(child_output_cell.cell_index, inst.trans))
    end
  end
end

# Report statistics
total_shapes = 0
layer_map.each do |input_idx, output_idx|
  count = 0
  output_layout.each_cell do |cell|
    count += cell.shapes(output_idx).size
  end
  
  if count > 0
    layer_info = input_layout.get_info(input_idx)
    layer_name = layer_info ? "#{layer_info.layer}/#{layer_info.datatype}" : "Unknown"
    puts "  Layer #{layer_name}: #{count} shapes"
    total_shapes += count
  end
end

# Write output
output_layout.write(output_file)

puts "Extraction complete!"
puts "  Total shapes extracted: #{total_shapes}"
puts "  Output file: #{output_file}"