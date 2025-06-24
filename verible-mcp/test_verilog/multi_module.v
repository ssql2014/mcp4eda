// File with multiple modules to test module-wise register counting

module cpu_core (
    input wire clk,
    input wire rst,
    input wire [31:0] instruction,
    output reg [31:0] data_out
);
    // CPU registers
    reg [31:0] pc;  // Program counter
    reg [31:0] ir;  // Instruction register
    reg [31:0] acc; // Accumulator
    reg [31:0] mar; // Memory address register
    reg [31:0] mdr; // Memory data register
    
    // General purpose registers
    reg [31:0] gpr [0:15];  // 16 general purpose registers
    
    // Status registers
    reg zero_flag;
    reg carry_flag;
    reg overflow_flag;
    reg negative_flag;
    
    always @(posedge clk) begin
        if (rst) begin
            pc <= 32'h0;
            ir <= 32'h0;
            acc <= 32'h0;
        end else begin
            ir <= instruction;
            pc <= pc + 4;
        end
    end
endmodule

module memory_controller (
    input wire clk,
    input wire [15:0] addr,
    input wire [31:0] write_data,
    output reg [31:0] read_data
);
    // Memory registers
    reg [31:0] memory_array [0:65535];  // 64K x 32-bit memory
    reg [15:0] addr_reg;
    reg [31:0] data_buffer;
    
    always @(posedge clk) begin
        addr_reg <= addr;
        data_buffer <= memory_array[addr_reg];
        read_data <= data_buffer;
    end
endmodule

module uart_controller (
    input wire clk,
    input wire rst,
    input wire rx,
    output reg tx
);
    // UART registers
    reg [7:0] tx_buffer;
    reg [7:0] rx_buffer;
    reg [3:0] bit_counter;
    reg [15:0] baud_counter;
    
    // State machine registers
    reg [1:0] tx_state;
    reg [1:0] rx_state;
    
    // Status registers
    reg tx_busy;
    reg rx_ready;
    reg parity_error;
    reg framing_error;
    
    always @(posedge clk) begin
        if (rst) begin
            tx_state <= 2'b00;
            rx_state <= 2'b00;
            bit_counter <= 4'b0;
        end
    end
endmodule

// Top-level module instantiating others
module soc_top (
    input wire sys_clk,
    input wire sys_rst,
    input wire uart_rx,
    output wire uart_tx
);
    // Top-level registers
    reg [7:0] chip_id = 8'hA5;
    reg [15:0] config_reg;
    
    wire [31:0] cpu_data;
    wire [31:0] mem_data;
    
    // Module instantiations
    cpu_core cpu (
        .clk(sys_clk),
        .rst(sys_rst),
        .instruction(mem_data),
        .data_out(cpu_data)
    );
    
    memory_controller mem_ctrl (
        .clk(sys_clk),
        .addr(cpu_data[15:0]),
        .write_data(cpu_data),
        .read_data(mem_data)
    );
    
    uart_controller uart (
        .clk(sys_clk),
        .rst(sys_rst),
        .rx(uart_rx),
        .tx(uart_tx)
    );
    
endmodule