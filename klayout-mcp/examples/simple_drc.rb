# Simple DRC rules example for KLayout
# This demonstrates basic DRC checks

# Define layers
metal1 = input(1, 0)
via1 = input(2, 0)
metal2 = input(3, 0)

# Metal1 rules
metal1.width(0.5.um).output("M1.W.1", "Metal1 width < 0.5um")
metal1.space(0.5.um).output("M1.S.1", "Metal1 spacing < 0.5um")
metal1.area(1.0.um2).output("M1.A.1", "Metal1 area < 1.0um²")

# Via1 rules
via1.width(0.4.um).output("V1.W.1", "Via1 width < 0.4um")
via1.space(0.4.um).output("V1.S.1", "Via1 spacing < 0.4um")

# Metal2 rules
metal2.width(0.6.um).output("M2.W.1", "Metal2 width < 0.6um")
metal2.space(0.6.um).output("M2.S.1", "Metal2 spacing < 0.6um")

# Enclosure rules
metal1.enclosing(via1, 0.1.um).output("M1.E.1", "Metal1 enclosure of Via1 < 0.1um")
metal2.enclosing(via1, 0.1.um).output("M2.E.1", "Metal2 enclosure of Via1 < 0.1um")

# Overlap check
via1.not_inside(metal1).output("V1.O.1", "Via1 not covered by Metal1")
via1.not_inside(metal2).output("V1.O.2", "Via1 not covered by Metal2")