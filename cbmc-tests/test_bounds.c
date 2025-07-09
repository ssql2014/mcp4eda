void array_access_bug() {
    int arr[5] = {1, 2, 3, 4, 5};
    int sum = 0;
    
    // Bug: accessing index 5 (out of bounds)
    for (int i = 0; i <= 5; i++) {
        sum += arr[i];
    }
}

void safe_array_access() {
    int arr[5] = {1, 2, 3, 4, 5};
    int sum = 0;
    
    // Correct: i < 5
    for (int i = 0; i < 5; i++) {
        sum += arr[i];
    }
}

int main() {
    array_access_bug();
    return 0;
}