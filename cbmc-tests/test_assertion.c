#include <assert.h>

int max(int a, int b) {
    if (a > b) {
        return a;
    }
    return b;
}

void test_max() {
    // This should pass
    assert(max(5, 3) == 5);
    assert(max(2, 7) == 7);
    assert(max(4, 4) == 4);
    
    // This will fail - intentional bug
    assert(max(-1, -2) == -2);  // Bug: should be -1
}

int main() {
    test_max();
    return 0;
}