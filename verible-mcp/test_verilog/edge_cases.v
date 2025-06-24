module edge_cases (
    input wire clk,
    input wire rst
);

    // Edge case 1: Registers declared in different styles
    reg r1, r2, r3;  // Multiple registers in one line
    reg [7:0] byte1, byte2, byte3;  // Multiple sized registers
    
    // Edge case 2: Complex bit selections
    reg [0:31] msb_first_reg;  // MSB first notation
    reg [31:0] lsb_first_reg;  // LSB first notation
    
    // Edge case 3: Signed registers
    reg signed [15:0] signed_reg;
    reg unsigned [15:0] unsigned_reg;
    
    // Edge case 4: Registers with initial values
    reg [7:0] init_reg = 8'hAA;
    reg [15:0] init_array [0:3] = '{16'h1111, 16'h2222, 16'h3333, 16'h4444};
    
    // Edge case 5: Registers in different contexts
    task automatic my_task;
        reg [7:0] task_local_reg;  // Task-local register
        begin
            task_local_reg = 8'h55;
        end
    endtask
    
    function [7:0] my_function(input [7:0] in);
        reg [7:0] func_local_reg;  // Function-local register
        begin
            func_local_reg = in + 1;
            my_function = func_local_reg;
        end
    endfunction
    
    // Edge case 6: Registers with attributes
    (* ram_style = "block" *) reg [7:0] attributed_mem [0:1023];
    (* preserve *) reg important_reg;
    
    // Edge case 7: SystemVerilog specific types
    logic [7:0] sv_logic_reg;
    logic signed [15:0] sv_signed_logic;
    
    // Edge case 8: Implicit register from always_latch
    reg [3:0] latch_reg;
    always_latch begin
        if (rst)
            latch_reg = 4'b0;
        else
            latch_reg = latch_reg + 1;
    end
    
    // Edge case 9: Registers in nested modules
    module nested_module (
        input wire nested_clk
    );
        reg [7:0] nested_reg;
        
        always @(posedge nested_clk) begin
            nested_reg <= nested_reg + 1;
        end
    endmodule
    
    nested_module inst (.nested_clk(clk));
    
    // Edge case 10: Non-standard but valid declarations
    reg
        [7:0]
        multiline_reg;  // Declaration split across lines
    
    // Edge case 11: Register used in continuous assignment (not actually a register)
    wire [7:0] not_a_reg;
    assign not_a_reg = 8'h42;  // This should NOT be counted as a register
    
    // Edge case 12: Signals that look like registers but aren't
    integer int_var;  // Integer variable, not a register
    real real_var;    // Real variable, not a register
    time time_var;    // Time variable, not a register

endmodule