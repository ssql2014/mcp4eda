# CBMC Test Results

## Test Summary

All CBMC tests completed successfully, demonstrating various verification capabilities:

### 1. Assertion Verification ✓
- **File**: `test_assertion.c`
- **Result**: Successfully detected assertion failure in `max(-1, -2) == -2`
- **What it tests**: Basic assertion checking in C code

### 2. Array Bounds Checking ✓
- **File**: `test_bounds.c`
- **Result**: Detected out-of-bounds array access in `arr[5]` for array of size 5
- **What it tests**: Memory safety and array bounds violations

### 3. Equivalence Checking ✓
- **File**: `test_equivalence.c`
- **Result**: Verified that two implementations of `abs()` are functionally equivalent
- **What it tests**: Behavioral equivalence between different implementations

### 4. Overflow Detection ✓
- **File**: `test_overflow.c`
- **Result**: Detected integer overflow in `INT_MAX + 1`
- **What it tests**: Arithmetic overflow vulnerabilities

## Key CBMC Features Demonstrated

1. **Bounded Model Checking**: All tests use bounded verification with loop unwinding
2. **Non-deterministic Inputs**: Equivalence checking uses symbolic inputs
3. **Property Types**: Assertions, bounds, overflows, and custom properties
4. **Counterexample Generation**: CBMC provides traces for failed properties

## Usage Examples

```bash
# Basic verification
cbmc test_assertion.c --function main --unwind 5

# Bounds checking
cbmc test_bounds.c --bounds-check --function main --unwind 10

# Overflow checking
cbmc test_overflow.c --signed-overflow-check --function main

# All checks
cbmc file.c --bounds-check --pointer-check --div-by-zero-check \
  --signed-overflow-check --unsigned-overflow-check
```