// Simple CPU example for testing RTL parser
module cpu_core #(
    parameter DATA_WIDTH = 32,
    parameter ADDR_WIDTH = 16
) (
    input wire clk,
    input wire rst_n,
    input wire enable,
    
    // Instruction memory interface
    output wire [ADDR_WIDTH-1:0] imem_addr,
    input wire [DATA_WIDTH-1:0] imem_data,
    
    // Data memory interface
    output wire [ADDR_WIDTH-1:0] dmem_addr,
    output wire [DATA_WIDTH-1:0] dmem_wdata,
    output wire dmem_wen,
    input wire [DATA_WIDTH-1:0] dmem_rdata
);

    // Program counter
    reg [ADDR_WIDTH-1:0] pc;
    reg [ADDR_WIDTH-1:0] pc_next;
    
    // Instruction register
    reg [DATA_WIDTH-1:0] ir;
    
    // Register file
    reg [DATA_WIDTH-1:0] reg_file [0:15];
    
    // ALU signals
    reg [DATA_WIDTH-1:0] alu_a, alu_b;
    reg [3:0] alu_op;
    wire [DATA_WIDTH-1:0] alu_result;
    
    // Control signals
    reg [2:0] state;
    localparam FETCH = 3'b000;
    localparam DECODE = 3'b001;
    localparam EXECUTE = 3'b010;
    localparam MEMORY = 3'b011;
    localparam WRITEBACK = 3'b100;
    
    // State machine
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            state <= FETCH;
            pc <= 0;
            ir <= 0;
        end else if (enable) begin
            case (state)
                FETCH: begin
                    ir <= imem_data;
                    state <= DECODE;
                end
                DECODE: begin
                    alu_a <= reg_file[ir[19:16]];
                    alu_b <= reg_file[ir[15:12]];
                    alu_op <= ir[23:20];
                    state <= EXECUTE;
                end
                EXECUTE: begin
                    state <= MEMORY;
                end
                MEMORY: begin
                    state <= WRITEBACK;
                end
                WRITEBACK: begin
                    reg_file[ir[11:8]] <= alu_result;
                    pc <= pc + 1;
                    state <= FETCH;
                end
            endcase
        end
    end
    
    // ALU instance
    alu #(
        .WIDTH(DATA_WIDTH)
    ) u_alu (
        .a(alu_a),
        .b(alu_b),
        .op(alu_op),
        .result(alu_result)
    );
    
    // Memory address assignment
    assign imem_addr = pc;
    assign dmem_addr = alu_result[ADDR_WIDTH-1:0];
    assign dmem_wdata = reg_file[ir[7:4]];
    assign dmem_wen = (state == MEMORY) && ir[31];

endmodule

module alu #(
    parameter WIDTH = 32
) (
    input wire [WIDTH-1:0] a,
    input wire [WIDTH-1:0] b,
    input wire [3:0] op,
    output reg [WIDTH-1:0] result
);

    always @(*) begin
        case (op)
            4'b0000: result = a + b;
            4'b0001: result = a - b;
            4'b0010: result = a & b;
            4'b0011: result = a | b;
            4'b0100: result = a ^ b;
            4'b0101: result = ~a;
            4'b0110: result = a << b[4:0];
            4'b0111: result = a >> b[4:0];
            default: result = 0;
        endcase
    end

endmodule