#include <assert.h>

int abs_v1(int x) {
    if (x < 0) {
        return -x;
    }
    return x;
}

int abs_v2(int x) {
    return (x < 0) ? -x : x;
}

void test_equivalence() {
    int x;  // Non-deterministic input
    
    int result1 = abs_v1(x);
    int result2 = abs_v2(x);
    
    // Assert they produce the same output
    assert(result1 == result2);
}

int main() {
    test_equivalence();
    return 0;
}