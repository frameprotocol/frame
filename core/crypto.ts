export { 
  generateP256KeyPair, 
  encryptMessage, 
  decryptMessage, 
  importJwk,
  base64ToBytes,
  bytesToBase64,
  type KeyPair 
} from "./ecdh.ts"; 
import * as ed25519 from "https://esm.sh/@noble/ed25519@1.7.1";
export function fromHex(hex: string): Uint8Array {
  if (!hex || typeof hex !== "string") throw new Error("Invalid hex input to fromHex");
  if (hex.length % 2 !== 0) throw new Error("Hex string must have even length");
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return arr;
}
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}
export async function generateEd25519KeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  try {
    const { generateP256KeyPair } = await import("./ecdh.ts");
    const keyPair = await generateP256KeyPair();
    return {
      publicKey: keyPair.signPublicKey,
      privateKey: keyPair.signPrivateKey
    };
  } catch (error) {
    console.error('Error in generateEd25519KeyPair:', error);
    throw error;
  }
}
export async function signEd25519(message: Uint8Array | string, privateKeyHex: string): Promise<string> {
  try {
    if (privateKeyHex.startsWith('{')) {
      const { sign } = await import("./utils.ts");
      const messageObj = { message: typeof message === "string" ? message : toHex(message) };
      return await sign(messageObj, privateKeyHex);
    }
    const msg = typeof message === "string" ? new TextEncoder().encode(message) : message;
    const privateKey = fromHex(privateKeyHex);
    const sig = ed25519.sign(msg, privateKey);
    return toHex(sig);
  } catch (error) {
    console.error('Error in signEd25519:', error);
    throw error;
  }
}
export async function verifyEd25519(message: Uint8Array | string, signatureHex: string, publicKeyHex: string): Promise<boolean> {
  try {
    if (publicKeyHex.startsWith('{')) {
      const { verify } = await import("./utils.ts");
      const messageObj = { message: typeof message === "string" ? message : toHex(message) };
      return await verify(messageObj, signatureHex, publicKeyHex);
    }
    const msg = typeof message === "string" ? new TextEncoder().encode(message) : message;
    const sig = fromHex(signatureHex);
    const pub = fromHex(publicKeyHex);
    return ed25519.verify(sig, msg, pub);
  } catch (error) {
    console.error('Error in verifyEd25519:', error);
    return false;
  }
}
export function hexToBase64(hex: string): string {
  const bytes = fromHex(hex);
  return btoa(String.fromCharCode(...bytes));
}
export function base64ToHex(base64: string): string {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  return toHex(bytes);
} 