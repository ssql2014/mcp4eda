// FIR filter implementation in C
#define TAPS 4

int fir_filter(int input, int coeffs[TAPS], int delay_line[TAPS]) {
    int result = 0;
    
    // Shift delay line
    for (int i = TAPS-1; i > 0; i--) {
        delay_line[i] = delay_line[i-1];
    }
    delay_line[0] = input;
    
    // Compute filter output
    for (int i = 0; i < TAPS; i++) {
        result += delay_line[i] * coeffs[i];
    }
    
    return result >> 16; // Fixed-point scaling
}