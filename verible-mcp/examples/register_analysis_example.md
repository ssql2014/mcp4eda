# Register Analysis Example

This example shows how to use the `verible_analyze` tool to detect and count registers in Verilog code.

## Example Code: cpu_core.v

The example CPU core contains various types of registers:
- Program counter (32-bit)
- Accumulator (32-bit)
- Register file (32 x 32-bit registers)
- State machine register (4-bit)
- Pipeline registers (3 x 32-bit)
- Various control flags (carry, zero)
- Cache memory arrays

## Usage

```javascript
// Analyze a single file
const result = await useTool('verible_analyze', {
  filepath: 'examples/cpu_core.v',
  analysis_type: 'registers'
});
```

## Expected Output

```json
{
  "success": true,
  "data": {
    "registers": [
      {
        "name": "pc",
        "width": 32,
        "type": "flip_flop",
        "clock": "clk",
        "reset": "rst_n",
        "file": "examples/cpu_core.v",
        "line": 8,
        "module": "cpu_core"
      },
      {
        "name": "accumulator",
        "width": 32,
        "type": "flip_flop",
        "clock": "clk",
        "reset": "rst_n",
        "file": "examples/cpu_core.v",
        "line": 9,
        "module": "cpu_core"
      },
      {
        "name": "reg_file_r",
        "width": 32,
        "type": "flip_flop",
        "clock": "clk",
        "reset": "rst_n",
        "file": "examples/cpu_core.v",
        "line": 15,
        "module": "cpu_core"
      },
      // ... more registers
    ],
    "totalRegisters": 15,
    "byType": {
      "flip_flop": 15,
      "latch": 0,
      "memory": 0
    },
    "byModule": {
      "cpu_core": [/* ... registers ... */],
      "memory_controller": [/* ... registers ... */]
    },
    "totalBits": 2624,
    "modules": [
      {
        "name": "cpu_core",
        "file": "examples/cpu_core.v",
        "line": 1,
        "registerCount": 11
      },
      {
        "name": "memory_controller",
        "file": "examples/cpu_core.v",
        "line": 86,
        "registerCount": 4
      }
    ]
  }
}
```

## Summary Statistics

For the example CPU core:
- **Total Registers**: 15 (not counting array elements individually)
- **Total Register Bits**: 2,624 bits
  - cpu_core: ~329 bits (excluding register file)
  - register file: 1,024 bits (32 x 32)
  - memory_controller cache: 8,192 bits (256 x 32)
- **Register Types**: All flip-flops (clocked registers)

## Common Use Cases

1. **Design Statistics**: Get register count and bit usage for area estimation
2. **Clock Domain Analysis**: Identify which registers use which clocks
3. **Reset Analysis**: Find registers without proper reset
4. **Module Comparison**: Compare register usage across modules
5. **Design Rule Checking**: Ensure naming conventions (e.g., _ff, _r suffixes)