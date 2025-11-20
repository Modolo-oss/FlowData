# FlowData Policy Package

Seal Policy Package for FlowData Studio. This package defines the access control policy for Seal encryption/decryption.

## Structure

```
flowdata-policy/
├── Move.toml          # Package configuration
├── sources/
│   └── policy.move    # Policy module with seal_approve function
└── README.md          # This file
```

## Deploy to Testnet

### Prerequisites

1. Install Sui CLI:
   ```bash
   cargo install --locked --git https://github.com/MystenLabs/sui.git --branch main sui
   ```

2. Set up Sui testnet account:
   ```bash
   sui client new-address ed25519
   sui client switch --env testnet
   ```

3. Get testnet SUI tokens:
   - Visit https://discord.com/channels/916379725201563759/971488439931392130
   - Use faucet: `!faucet <your-address>`

### Deploy

1. Navigate to policy package directory:
   ```bash
   cd flowdata-policy
   ```

2. Publish to testnet:
   ```bash
   sui client publish --gas-budget 20000000
   ```

3. Save the output package ID:
   ```
   Published package:
   {
     packageId: 0x8d3a4a8c8340a1ab45c9dc06ad...
   }
   ```

4. Update `.env` file in project root:
   ```env
   SEAL_POLICY_PACKAGE_ID=0x8d3a4a8c8340a1ab45c9dc06ad...
   SEAL_POLICY_MODULE=policy
   SEAL_POLICY_FUNCTION=seal_approve_entry
   ```

## How It Works

1. **Encryption**: When data is encrypted using Seal SDK, it uses the policy package ID
2. **Decryption Request**: When decrypting, Seal key servers check the policy package
3. **Policy Verification**: Key servers call `seal_approve_entry` function via transaction
4. **Access Control**: The policy function returns `true` if access is approved, `false` otherwise
5. **Decryption**: If approved, key servers provide decryption keys

## Customization

Edit `sources/policy.move` to add custom access control logic:

```move
public fun seal_approve(id: vector<u8>, ctx: &mut TxContext): bool {
    // Add your custom logic here:
    // - Check user permissions
    // - Verify content ownership
    // - Apply rate limiting
    // - Check subscription status
    
    true  // or false to deny access
}
```

## For Hackathon MVP

The current implementation approves all requests (`return true`). This is fine for hackathon MVP but should be customized for production use.

## Production Considerations

1. **Access Control**: Implement proper permission checks
2. **Rate Limiting**: Prevent abuse with rate limiting
3. **Ownership Verification**: Verify user owns the content
4. **Subscription Checks**: Verify user has active subscription
5. **Audit Logging**: Log all access attempts for security





