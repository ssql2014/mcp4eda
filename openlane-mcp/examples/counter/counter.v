module counter #(
    parameter WIDTH = 8
) (
    input wire clk,
    input wire rst,
    input wire enable,
    output reg [WIDTH-1:0] count,
    output wire overflow
);

    assign overflow = &count;

    always @(posedge clk) begin
        if (rst) begin
            count <= {WIDTH{1'b0}};
        end else if (enable) begin
            count <= count + 1'b1;
        end
    end

endmodule