# Example Python script for calculating layer density in KLayout
import pya

# Access input file from parameters
if 'input_files' in globals() and input_files:
    layout = pya.Layout()
    layout.read(input_files[0])
    
    # Get top cell
    top_cell = layout.top_cell()
    if top_cell:
        print(f"Analyzing layout: {top_cell.name}")
        print("-" * 50)
        
        # Calculate area
        bbox = top_cell.bbox()
        total_area = bbox.area() / 1e6  # Convert to um²
        print(f"Total chip area: {total_area:.2f} um²")
        print("-" * 50)
        
        # Analyze each layer
        layer_infos = layout.layer_infos()
        for layer_info in layer_infos:
            layer_index = layout.layer(layer_info.layer, layer_info.datatype)
            
            # Create region from all shapes on this layer
            region = pya.Region()
            for cell in layout.each_cell():
                trans = pya.ICplxTrans.from_dtrans(pya.DCplxTrans())
                for inst in top_cell.each_inst():
                    if inst.cell == cell:
                        trans = inst.dcplx_trans
                
                for shape in cell.shapes(layer_index).each():
                    if shape.is_polygon():
                        poly = shape.polygon.transformed(trans)
                        region.insert(poly)
                    elif shape.is_box():
                        box = shape.box.transformed(trans)
                        region.insert(box)
            
            # Merge overlapping shapes
            region.merge()
            
            # Calculate area
            layer_area = region.area() / 1e6  # Convert to um²
            density = (layer_area / total_area) * 100 if total_area > 0 else 0
            
            layer_name = f"Layer {layer_info.layer}/{layer_info.datatype}"
            if layer_info.name:
                layer_name += f" ({layer_info.name})"
            
            print(f"{layer_name}:")
            print(f"  Area: {layer_area:.2f} um²")
            print(f"  Density: {density:.2f}%")
            print(f"  Shape count: {region.count()}")
else:
    print("No input file provided. Use 'inputFiles' parameter.")