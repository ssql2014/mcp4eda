module counter (
    input wire clk,
    input wire rst,
    output reg [7:0] count
);

always @(posedge clk or posedge rst) begin
    if (rst)
        count <= 8'b0;
    else
        count <= count + 1'b1;
end

endmodule