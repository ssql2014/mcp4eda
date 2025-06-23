module adder #(
  parameter WIDTH = 8
) (
  input  wire             clk,
  input  wire             rst_n,
  input  wire [WIDTH-1:0] a,
  input  wire [WIDTH-1:0] b,
  output reg  [WIDTH:0]   sum
);

  always @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      sum <= 0;
    end else begin
      sum <= a + b;
    end
  end

endmodule