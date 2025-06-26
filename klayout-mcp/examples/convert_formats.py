# Batch format converter example for KLayout
import pya
import os
import glob

# Configuration
input_pattern = "*.gds"  # Change to match your input files
output_format = "oas"    # Target format: oas, gds, dxf, cif
scale_factor = 1.0       # Scaling factor (e.g., 0.001 to convert nm to um)

# Find all matching files
input_files = glob.glob(input_pattern)

if not input_files:
    print(f"No files found matching pattern: {input_pattern}")
    exit(1)

print(f"Found {len(input_files)} files to convert")

# Convert each file
for input_file in input_files:
    print(f"\nProcessing: {input_file}")
    
    try:
        # Load layout
        layout = pya.Layout()
        layout.read(input_file)
        
        # Apply scaling if needed
        if scale_factor != 1.0:
            trans = pya.DCplxTrans(scale_factor)
            for cell in layout.each_cell():
                cell.transform(trans)
            print(f"  Applied scaling factor: {scale_factor}")
        
        # Generate output filename
        base_name = os.path.splitext(input_file)[0]
        output_file = f"{base_name}.{output_format}"
        
        # Write output
        layout.write(output_file)
        print(f"  Created: {output_file}")
        
        # Report file sizes
        input_size = os.path.getsize(input_file)
        output_size = os.path.getsize(output_file)
        
        if output_format == "oas":
            compression = (1 - output_size/input_size) * 100
            print(f"  Compression: {compression:.1f}%")
        
        print(f"  Input size: {input_size/1024/1024:.2f} MB")
        print(f"  Output size: {output_size/1024/1024:.2f} MB")
        
    except Exception as e:
        print(f"  ERROR: {str(e)}")
        continue

print(f"\nConversion complete!")