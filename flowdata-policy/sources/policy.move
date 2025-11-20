module flowdata_policy::policy;

use sui::tx_context::TxContext;

/// Policy function for Seal encryption/decryption
/// This function is called by Seal key servers to verify access permissions
/// 
/// Parameters:
/// - `id`: The content ID (user address or content identifier)
/// - `ctx`: Transaction context
/// 
/// Returns: true if access is approved, false otherwise
/// 
/// Note: Seal key servers will call this function via the policy package
/// to verify that the user has permission to decrypt the encrypted data.
public fun seal_approve(id: vector<u8>, ctx: &mut TxContext): bool {
    // For FlowData Studio: approve all requests
    // In production, you can add custom logic here:
    // - Check user permissions
    // - Verify content ownership
    // - Apply rate limiting
    // - Check subscription status
    // - Verify sessionKey matches the id
    
    // For hackathon MVP: approve all
    // The id parameter contains the user address or content identifier
    // You can add validation logic here if needed
    
    true
}

/// Entry function wrapper for Seal key servers
/// This is the function that Seal SDK will call via txBytes
/// 
/// Seal key servers will execute this function to verify access permissions
/// before allowing decryption of encrypted data.
entry public fun seal_approve_entry(id: vector<u8>, ctx: &mut TxContext) {
    let approved = seal_approve(id, ctx);
    assert!(approved, 0); // Abort if not approved (error code 0)
}

