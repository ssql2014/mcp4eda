// Simple 8-bit counter module for testing Verilator MCP
module counter #(
  parameter WIDTH = 8,
  parameter MAX_COUNT = 255
)(
  input  wire               clk,
  input  wire               rst_n,
  input  wire               enable,
  input  wire               clear,
  output reg  [WIDTH-1:0]   count,
  output wire               overflow
);

  // Overflow detection
  assign overflow = (count == MAX_COUNT) && enable;

  // Counter logic
  always @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      count <= {WIDTH{1'b0}};
    end else if (clear) begin
      count <= {WIDTH{1'b0}};
    end else if (enable) begin
      if (count == MAX_COUNT) begin
        count <= {WIDTH{1'b0}};
      end else begin
        count <= count + 1'b1;
      end
    end
  end

endmodule