#include <assert.h>

int sum_array(int arr[], int size) {
    int sum = 0;
    // Bug: should be i < size
    for (int i = 0; i <= size; i++) {
        sum += arr[i];  // Potential array bounds violation
    }
    return sum;
}

void safe_array_access() {
    int arr[5] = {1, 2, 3, 4, 5};
    int result = sum_array(arr, 5);
    assert(result == 15);
}