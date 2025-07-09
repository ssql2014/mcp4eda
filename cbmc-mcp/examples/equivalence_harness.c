// Example harness for testing equivalence checking
#include <assert.h>

// Two implementations of absolute value function
int abs_v1(int x) {
    if (x < 0) {
        return -x;
    }
    return x;
}

int abs_v2(int x) {
    return (x < 0) ? -x : x;
}

void check_equivalence() {
    int x;  // Non-deterministic input
    
    int result1 = abs_v1(x);
    int result2 = abs_v2(x);
    
    // These should be equivalent
    assert(result1 == result2);
}