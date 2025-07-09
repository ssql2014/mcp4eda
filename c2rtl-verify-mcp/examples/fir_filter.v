// FIR filter implementation in Verilog
module fir_filter #(
    parameter TAPS = 4,
    parameter WIDTH = 32
)(
    input wire clk,
    input wire rst,
    input wire signed [WIDTH-1:0] input_data,
    input wire input_valid,
    output reg signed [WIDTH-1:0] output_data,
    output reg output_valid
);

    // Filter coefficients (hardcoded for verification)
    reg signed [WIDTH-1:0] coeffs [0:TAPS-1];
    reg signed [WIDTH-1:0] delay_line [0:TAPS-1];
    reg signed [2*WIDTH-1:0] accumulator;
    integer i;
    
    initial begin
        coeffs[0] = 32'h1000; // 0.0625 in Q16
        coeffs[1] = 32'h4000; // 0.25 in Q16
        coeffs[2] = 32'h4000; // 0.25 in Q16
        coeffs[3] = 32'h1000; // 0.0625 in Q16
    end
    
    always @(posedge clk) begin
        if (rst) begin
            for (i = 0; i < TAPS; i = i + 1) begin
                delay_line[i] <= 0;
            end
            output_data <= 0;
            output_valid <= 0;
        end else if (input_valid) begin
            // Shift delay line
            for (i = TAPS-1; i > 0; i = i - 1) begin
                delay_line[i] <= delay_line[i-1];
            end
            delay_line[0] <= input_data;
            
            // Compute filter output
            accumulator = 0;
            for (i = 0; i < TAPS; i = i + 1) begin
                accumulator = accumulator + (delay_line[i] * coeffs[i]);
            end
            
            output_data <= accumulator >>> 16; // Fixed-point scaling
            output_valid <= 1;
        end else begin
            output_valid <= 0;
        end
    end
endmodule