#!/bin/bash
# Build script with retry logic for Render deployment

set -e

echo "Starting build process..."

# Retry function
retry() {
    local max_attempts=3
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo "Attempt $attempt of $max_attempts..."
        if "$@"; then
            echo "Success!"
            return 0
        else
            if [ $attempt -lt $max_attempts ]; then
                echo "Failed. Retrying in 5 seconds..."
                sleep 5
            fi
            attempt=$((attempt + 1))
        fi
    done
    
    echo "All attempts failed."
    return 1
}

# Upgrade pip first
echo "Upgrading pip..."
retry pip install --upgrade pip

# Install requirements with retry
echo "Installing requirements..."
retry pip install --no-cache-dir -r requirements.txt

echo "Build completed successfully!"
