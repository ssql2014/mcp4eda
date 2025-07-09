#include <assert.h>

int abs_value(int x) {
    if (x < 0) {
        return -x;
    }
    return x;
}

int main() {
    int a = -5;
    int result = abs_value(a);
    assert(result == 5);
    
    // This should pass
    assert(abs_value(-10) == 10);
    assert(abs_value(10) == 10);
    assert(abs_value(0) == 0);
    
    return 0;
}