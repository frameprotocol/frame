import { x25519 } from "https://esm.sh/@noble/curves@1.2.0/ed25519";
import { randomBytes } from "https://esm.sh/@noble/hashes@1.3.3/utils";
export interface KeyPair {
  publicKey: string; 
  privateKey: string; 
  signPublicKey: string; 
  signPrivateKey: string; 
}
export async function generateX25519KeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  const privateKeyBytes = randomBytes(32);
  const publicKeyBytes = x25519.getPublicKey(privateKeyBytes);
  const privateKeyJwk: JsonWebKey = {
    kty: "OKP",
    crv: "X25519",
    d: btoa(String.fromCharCode(...privateKeyBytes)), 
    x: btoa(String.fromCharCode(...publicKeyBytes)),  
    key_ops: ["deriveKey", "deriveBits"]
  };
  const publicKeyJwk: JsonWebKey = {
    kty: "OKP", 
    crv: "X25519",
    x: btoa(String.fromCharCode(...publicKeyBytes)), 
    key_ops: ["deriveKey"]
  };
  return {
    publicKey: JSON.stringify(publicKeyJwk),
    privateKey: JSON.stringify(privateKeyJwk)
  };
}
export async function generateP256KeyPair(): Promise<KeyPair> {
  const x25519KeyPair = await generateX25519KeyPair();
  const ecdsaKeyPair = await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256"
    },
    true,
    ["sign", "verify"]
  );
  const ecdsaPublicKeyJwk = await crypto.subtle.exportKey("jwk", ecdsaKeyPair.publicKey);
  const ecdsaPrivateKeyJwk = await crypto.subtle.exportKey("jwk", ecdsaKeyPair.privateKey);
  return {
    publicKey: x25519KeyPair.publicKey, 
    privateKey: x25519KeyPair.privateKey, 
    signPublicKey: JSON.stringify(ecdsaPublicKeyJwk),
    signPrivateKey: JSON.stringify(ecdsaPrivateKeyJwk)
  };
}
function deriveSharedSecret(privateKeyJwk: string, publicKeyJwk: string): Uint8Array {
  const privateKeyData = JSON.parse(privateKeyJwk);
  const publicKeyData = JSON.parse(publicKeyJwk);
  const privateKeyBytes = Uint8Array.from(atob(privateKeyData.d), c => c.charCodeAt(0));
  const publicKeyBytes = Uint8Array.from(atob(publicKeyData.x), c => c.charCodeAt(0));
  return x25519.getSharedSecret(privateKeyBytes, publicKeyBytes);
}
async function deriveAesKey(sharedSecret: Uint8Array): Promise<CryptoKey> {
  const salt = new Uint8Array(32); 
  const info = new TextEncoder().encode("FRAME-AES-GCM");
  const sharedKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    { name: "HKDF" },
    false,
    ["deriveKey"]
  );
  return await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      salt: salt,
      info: info,
      hash: "SHA-256"
    },
    sharedKey,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}
export async function encryptMessage(
  plaintext: string, 
  senderPrivateKeyJwk: string, 
  recipientPublicKeyJwk: string
): Promise<{ ciphertext: string; nonce: string }> {
  const sharedSecret = deriveSharedSecret(senderPrivateKeyJwk, recipientPublicKeyJwk);
  const aesKey = await deriveAesKey(sharedSecret);
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    aesKey,
    data
  );
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    nonce: btoa(String.fromCharCode(...nonce))
  };
}
export async function decryptMessage(
  ciphertext: string, 
  nonce: string, 
  recipientPrivateKeyJwk: string, 
  senderPublicKeyJwk: string
): Promise<string> {
  const sharedSecret = deriveSharedSecret(recipientPrivateKeyJwk, senderPublicKeyJwk);
  const aesKey = await deriveAesKey(sharedSecret);
  const decoder = new TextDecoder();
  const ciphertextBytes = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const nonceBytes = Uint8Array.from(atob(nonce), c => c.charCodeAt(0));
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonceBytes },
    aesKey,
    ciphertextBytes
  );
  return decoder.decode(plaintext);
}
export async function importJwk(jwk: JsonWebKey, usage: KeyUsage[]): Promise<CryptoKey> {
  let alg: EcKeyImportParams;
  if (jwk.kty === "EC" && jwk.crv === "P-256") {
    const isSigning = usage.includes("sign") || usage.includes("verify");
    alg = isSigning
      ? { name: "ECDSA", namedCurve: "P-256" }
      : { name: "ECDH", namedCurve: "P-256" };
  } else {
    throw new Error("Unsupported key type");
  }
  return await crypto.subtle.importKey(
    "jwk",
    jwk,
    alg,
    false,
    usage
  );
}
export function base64ToBytes(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}
export function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
} 