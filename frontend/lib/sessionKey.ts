/**
 * Session Key Generation for Sui Seal Encryption
 * Generates ephemeral session keys for encrypted federated learning
 */

// Note: IntentScope is not exported from @mysten/sui/cryptography in this version
// Using string literal "PersonalMessage" instead
import { messageWithIntent } from '@mysten/sui/cryptography';

export interface SessionKeyPair {
  sessionKey: string;
  publicKey: string;
}

/**
 * Generate a session key for Seal encryption
 * Uses Sui's standard signature format
 */
export async function generateSessionKey(
  signMessage: (message: Uint8Array) => Promise<string>
): Promise<SessionKeyPair> {
  try {
    // Create a message to sign (timestamp + random nonce)
    const timestamp = Date.now().toString();
    const nonce = crypto.getRandomValues(new Uint8Array(16));
    const message = new TextEncoder().encode(`FlowData Session Key: ${timestamp}${Array.from(nonce).map(b => b.toString(16).padStart(2, '0')).join('')}`);

    // Sign with PersonalMessage intent (using string literal)
    const intentMessage = messageWithIntent("PersonalMessage", message);
    const signature = await signMessage(intentMessage);

    // Extract session key from signature
    // For Seal, we use the signature itself as the session key
    const sessionKey = signature;

    // Extract public key if available (for verification)
    // This is a simplified version - in production, you'd extract from the signature
    const publicKey = sessionKey.slice(0, 64); // Simplified extraction

    return {
      sessionKey,
      publicKey,
    };
  } catch (error: any) {
    throw new Error(`Failed to generate session key: ${error.message}`);
  }
}

/**
 * Generate ephemeral session key (fallback when wallet not connected)
 * This creates a temporary keypair for development/testing
 */
export async function generateEphemeralSessionKey(): Promise<SessionKeyPair> {
  // Generate a random session key for development
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const sessionKey = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return {
    sessionKey,
    publicKey: sessionKey.slice(0, 64),
  };
}

