module simple_registers (
    input wire clk,
    input wire rst,
    input wire [7:0] data_in,
    output reg [7:0] data_out
);

    // Simple register declarations
    reg [31:0] counter;
    reg [15:0] status_reg;
    reg single_bit_reg;
    
    // Register array
    reg [7:0] memory [0:255];
    
    // Logic type registers (SystemVerilog style)
    logic [63:0] wide_register;
    logic [3:0] nibble_reg;
    
    // Always block with register assignments
    always @(posedge clk or posedge rst) begin
        if (rst) begin
            counter <= 32'd0;
            status_reg <= 16'h0000;
            single_bit_reg <= 1'b0;
            data_out <= 8'd0;
        end else begin
            counter <= counter + 1;
            status_reg <= {status_reg[14:0], data_in[0]};
            single_bit_reg <= data_in[7];
            data_out <= data_in;
        end
    end
    
    // Another always block with different registers
    reg [11:0] timer;
    reg [2:0] state;
    
    always @(posedge clk) begin
        timer <= timer + 1;
        state <= state + 1;
    end

endmodule