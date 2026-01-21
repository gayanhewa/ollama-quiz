#!/bin/bash

echo "Deploying Ollama Quiz API to Fly.io"
echo "===================================="

# Check if fly CLI is installed
if ! command -v flyctl &> /dev/null; then
    echo "Error: Fly CLI is not installed"
    echo "Install it with: curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Initialize app if not already done
if [ ! -f "fly.toml" ]; then
    echo "Initializing Fly app..."
    flyctl launch --name ollama-quiz --region sjc --no-deploy
else
    echo "Using existing Fly configuration"
fi

# Create volume for Ollama models (if not exists)
echo "Creating volume for Ollama models..."
flyctl volumes create ollama_data --size 10 --region sjc -y 2>/dev/null || echo "Volume may already exist"

# Deploy the app
echo "Deploying application..."
flyctl deploy --ha=false --strategy immediate

# Scale to appropriate VM size for Ollama
echo "Scaling VM for Ollama requirements..."
flyctl scale vm shared-cpu-4x --memory 2048

# Show app status
echo ""
echo "Deployment complete! App status:"
flyctl status

# Show app URL
echo ""
echo "Your app is available at:"
flyctl info | grep "Hostname"

echo ""
echo "To view logs: flyctl logs"
echo "To SSH into the container: flyctl ssh console"