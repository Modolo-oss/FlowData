#!/bin/bash
# Deploy FlowData Policy Package to Sui Testnet
# Bash script for WSL Ubuntu / Linux

set -e

echo "🚀 Deploying FlowData Policy Package to Sui Testnet..."
echo ""

# Check if Sui CLI is installed
echo "Checking Sui CLI installation..."

# Try to find sui in common locations
SUI_CMD=""
if command -v sui &> /dev/null; then
    SUI_CMD="sui"
elif [ -f "$HOME/.local/bin/sui" ]; then
    SUI_CMD="$HOME/.local/bin/sui"
elif [ -f "$HOME/.cargo/bin/sui" ]; then
    SUI_CMD="$HOME/.cargo/bin/sui"
else
    echo "❌ Sui CLI not found!"
    echo ""
    echo "Please ensure Sui CLI is installed:"
    echo "  - Check: ~/.local/bin/sui"
    echo "  - Check: ~/.cargo/bin/sui"
    echo "  - Or add to PATH: export PATH=\$PATH:\$HOME/.local/bin"
    echo ""
    exit 1
fi

SUI_VERSION=$($SUI_CMD --version 2>&1 || echo "unknown")
echo "✅ Sui CLI found: $SUI_CMD ($SUI_VERSION)"
echo ""

# Check current environment
echo "Checking Sui environment..."
CURRENT_ENV=$($SUI_CMD client active-env 2>&1 || echo "none")
if [ "$CURRENT_ENV" != "testnet" ]; then
    echo "⚠️  Not on testnet. Switching to testnet..."
    $SUI_CMD client switch --env testnet
else
    echo "Current environment: $CURRENT_ENV"
fi

echo ""

# Check active address
echo "Checking active address..."
ACTIVE_ADDRESS=$($SUI_CMD client active-address 2>&1 || echo "")
if [ -z "$ACTIVE_ADDRESS" ] || [[ "$ACTIVE_ADDRESS" == *"error"* ]]; then
    echo "❌ No active address found!"
    echo ""
    echo "Please create a new address:"
    echo "  $SUI_CMD client new-address ed25519"
    echo ""
    echo "Then get testnet SUI from faucet:"
    echo "  Discord: https://discord.com/channels/916379725201563759/971488439931392130"
    echo "  Command: !faucet $ACTIVE_ADDRESS"
    echo ""
    exit 1
fi

echo "✅ Active address: $ACTIVE_ADDRESS"
echo ""

# Check balance
echo "Checking SUI balance..."
BALANCE=$($SUI_CMD client gas 2>&1 || echo "unknown")
if [[ "$BALANCE" != *"error"* ]]; then
    echo "Balance: $BALANCE"
else
    echo "⚠️  Could not check balance. Continuing anyway..."
fi
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Deploy package
echo "📦 Publishing policy package..."
echo ""

DEPLOY_OUTPUT=$($SUI_CMD client publish --gas-budget 20000000 2>&1)
DEPLOY_EXIT_CODE=$?

if [ $DEPLOY_EXIT_CODE -ne 0 ]; then
    echo "❌ Deployment failed!"
    echo ""
    echo "Error output:"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

echo "✅ Deployment successful!"
echo ""

# Extract package ID from output
PACKAGE_ID=$(echo "$DEPLOY_OUTPUT" | grep -oP 'packageId.*?0x[a-fA-F0-9]+' | grep -oP '0x[a-fA-F0-9]+' | head -1)

if [ -n "$PACKAGE_ID" ]; then
    echo "📋 Package ID: $PACKAGE_ID"
    echo ""
    echo "Next steps:"
    echo "1. Update your .env file:"
    echo "   SEAL_POLICY_PACKAGE_ID=$PACKAGE_ID"
    echo ""
    echo "2. Restart your backend server"
    echo ""
    
    # Try to update .env automatically
    ENV_FILE="$(dirname "$SCRIPT_DIR")/.env"
    if [ -f "$ENV_FILE" ]; then
        echo "💾 Updating .env file automatically..."
        if grep -q "SEAL_POLICY_PACKAGE_ID=" "$ENV_FILE"; then
            # Update existing
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                sed -i '' "s/SEAL_POLICY_PACKAGE_ID=.*/SEAL_POLICY_PACKAGE_ID=$PACKAGE_ID/" "$ENV_FILE"
            else
                # Linux
                sed -i "s/SEAL_POLICY_PACKAGE_ID=.*/SEAL_POLICY_PACKAGE_ID=$PACKAGE_ID/" "$ENV_FILE"
            fi
        else
            # Add new
            echo "" >> "$ENV_FILE"
            echo "SEAL_POLICY_PACKAGE_ID=$PACKAGE_ID" >> "$ENV_FILE"
        fi
        echo "✅ .env file updated!"
    else
        echo "⚠️  .env file not found at $ENV_FILE"
        echo "Please create it manually with:"
        echo "  SEAL_POLICY_PACKAGE_ID=$PACKAGE_ID"
    fi
else
    echo "⚠️  Could not extract package ID from output."
    echo "Please check the output above and update .env manually."
    echo ""
    echo "Full output:"
    echo "$DEPLOY_OUTPUT"
fi

echo ""
echo "🎉 Deployment complete!"

