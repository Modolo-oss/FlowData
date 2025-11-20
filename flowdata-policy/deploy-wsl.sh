#!/bin/bash
# Wrapper script to deploy from WSL
# Run this from inside WSL Ubuntu terminal

set -e

# Get script directory (works in WSL)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Find Sui CLI
SUI_CMD=""
if command -v sui &> /dev/null; then
    SUI_CMD="sui"
elif [ -f "$HOME/.local/bin/sui" ]; then
    SUI_CMD="$HOME/.local/bin/sui"
elif [ -f "$HOME/.cargo/bin/sui" ]; then
    SUI_CMD="$HOME/.cargo/bin/sui"
else
    echo "❌ Sui CLI not found!"
    echo "Please ensure Sui CLI is installed in ~/.local/bin or ~/.cargo/bin"
    exit 1
fi

echo "🚀 Deploying FlowData Policy Package to Sui Testnet..."
echo "Using Sui CLI: $SUI_CMD"
echo ""

# Check environment
CURRENT_ENV=$($SUI_CMD client active-env 2>&1 || echo "none")
if [ "$CURRENT_ENV" != "testnet" ]; then
    echo "⚠️  Switching to testnet..."
    $SUI_CMD client switch --env testnet
fi

# Check address
ACTIVE_ADDRESS=$($SUI_CMD client active-address 2>&1 || echo "")
if [ -z "$ACTIVE_ADDRESS" ] || [[ "$ACTIVE_ADDRESS" == *"error"* ]]; then
    echo "❌ No active address found!"
    echo "Run: $SUI_CMD client new-address ed25519"
    exit 1
fi

echo "✅ Active address: $ACTIVE_ADDRESS"
echo ""

# Check balance
BALANCE=$($SUI_CMD client gas 2>&1 || echo "")
echo "Balance: $BALANCE"
echo ""

# Deploy
echo "📦 Publishing policy package..."
echo ""

DEPLOY_OUTPUT=$($SUI_CMD client publish --gas-budget 20000000 2>&1)
DEPLOY_EXIT_CODE=$?

if [ $DEPLOY_EXIT_CODE -ne 0 ]; then
    echo "❌ Deployment failed!"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

echo "✅ Deployment successful!"
echo ""

# Extract package ID
PACKAGE_ID=$(echo "$DEPLOY_OUTPUT" | grep -oP 'packageId.*?0x[a-fA-F0-9]+' | grep -oP '0x[a-fA-F0-9]+' | head -1)

if [ -n "$PACKAGE_ID" ]; then
    echo "📋 Package ID: $PACKAGE_ID"
    echo ""
    
    # Try to update .env (Windows path from WSL)
    ENV_FILE_WSL="/mnt/c/Users/Antidump/Walrus Hackathon/.env"
    if [ -f "$ENV_FILE_WSL" ]; then
        echo "💾 Updating .env file..."
        if grep -q "SEAL_POLICY_PACKAGE_ID=" "$ENV_FILE_WSL"; then
            sed -i "s/SEAL_POLICY_PACKAGE_ID=.*/SEAL_POLICY_PACKAGE_ID=$PACKAGE_ID/" "$ENV_FILE_WSL"
        else
            echo "" >> "$ENV_FILE_WSL"
            echo "SEAL_POLICY_PACKAGE_ID=$PACKAGE_ID" >> "$ENV_FILE_WSL"
        fi
        echo "✅ .env file updated!"
    else
        echo "⚠️  .env file not found. Please add manually:"
        echo "   SEAL_POLICY_PACKAGE_ID=$PACKAGE_ID"
    fi
else
    echo "⚠️  Could not extract package ID."
    echo "Full output:"
    echo "$DEPLOY_OUTPUT"
fi

echo ""
echo "🎉 Done!"





