#include <limits.h>

int add_overflow(int a, int b) {
    // This can overflow
    return a + b;
}

int safe_add(int a, int b) {
    // Check for overflow before addition
    if (a > 0 && b > INT_MAX - a) {
        return INT_MAX;
    }
    if (a < 0 && b < INT_MIN - a) {
        return INT_MIN;
    }
    return a + b;
}

int main() {
    // Test case that will overflow
    int result = add_overflow(INT_MAX, 1);
    return 0;
}