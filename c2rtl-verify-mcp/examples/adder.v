// Simple adder module for C2RTL verification
module adder (
    input wire [31:0] a,
    input wire [31:0] b,
    output wire [31:0] sum
);
    assign sum = a + b;
endmodule

// Saturating adder
module adder_sat (
    input wire signed [31:0] a,
    input wire signed [31:0] b,
    output reg signed [31:0] sum
);
    wire signed [32:0] result;
    assign result = {a[31], a} + {b[31], b};
    
    always @(*) begin
        if (result > 33'sh7FFFFFFF)
            sum = 32'sh7FFFFFFF;
        else if (result < -33'sh80000000)
            sum = -32'sh80000000;
        else
            sum = result[31:0];
    end
endmodule