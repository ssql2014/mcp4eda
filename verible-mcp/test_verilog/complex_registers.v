module complex_registers #(
    parameter DATA_WIDTH = 32,
    parameter ADDR_WIDTH = 10
) (
    input wire clk,
    input wire rst_n,
    input wire [DATA_WIDTH-1:0] data_in,
    output reg [DATA_WIDTH-1:0] data_out
);

    // Parameterized registers
    reg [DATA_WIDTH-1:0] data_buffer;
    reg [ADDR_WIDTH-1:0] address_reg;
    
    // Multi-dimensional arrays
    reg [7:0] reg_file [0:31][0:3];  // 32x4 register file
    reg [DATA_WIDTH-1:0] fifo_mem [0:(1<<ADDR_WIDTH)-1];
    
    // Packed and unpacked arrays
    reg [3:0][7:0] packed_array;  // 32-bit register as packed array
    reg [15:0] unpacked_array [0:7];  // 8 16-bit registers
    
    // Struct-like register groups (using concatenation)
    reg [7:0] ctrl_status;
    reg [15:0] ctrl_config;
    reg [31:0] ctrl_data;
    
    // Registers inferred from always blocks
    reg [DATA_WIDTH-1:0] pipeline_stage1;
    reg [DATA_WIDTH-1:0] pipeline_stage2;
    reg [DATA_WIDTH-1:0] pipeline_stage3;
    
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            pipeline_stage1 <= {DATA_WIDTH{1'b0}};
            pipeline_stage2 <= {DATA_WIDTH{1'b0}};
            pipeline_stage3 <= {DATA_WIDTH{1'b0}};
            data_out <= {DATA_WIDTH{1'b0}};
        end else begin
            pipeline_stage1 <= data_in;
            pipeline_stage2 <= pipeline_stage1;
            pipeline_stage3 <= pipeline_stage2;
            data_out <= pipeline_stage3;
        end
    end
    
    // Generate block with registers
    genvar i;
    generate
        for (i = 0; i < 4; i = i + 1) begin : gen_regs
            reg [7:0] gen_register;
            
            always @(posedge clk) begin
                gen_register <= data_in[i*8 +: 8];
            end
        end
    endgenerate
    
    // FSM with state register
    localparam IDLE = 3'b000;
    localparam ACTIVE = 3'b001;
    localparam DONE = 3'b010;
    
    reg [2:0] current_state, next_state;
    
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n)
            current_state <= IDLE;
        else
            current_state <= next_state;
    end

endmodule