#!/bin/bash

# Script to read e2e test output from Windows execution

OUTPUT_FILE="/mnt/c/users/jorda/documents/github/adhdtodo/e2e_output.log"

if [ -f "$OUTPUT_FILE" ]; then
    echo "=== E2E Test Output from Windows ==="
    echo
    cat "$OUTPUT_FILE"
    echo
    echo "=== End of Output ==="
else
    echo "No e2e output file found at: $OUTPUT_FILE"
    echo "Run RUN_E2E_WINDOWS.bat from Windows first."
fi