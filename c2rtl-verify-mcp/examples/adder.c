// Simple adder function for C2RTL verification
int add(int a, int b) {
    return a + b;
}

// Saturating adder
int add_sat(int a, int b) {
    long long result = (long long)a + (long long)b;
    if (result > 0x7FFFFFFF) return 0x7FFFFFFF;
    if (result < -0x80000000) return -0x80000000;
    return (int)result;
}