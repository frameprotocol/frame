// crypto.js: Web Crypto ECDSA P-256 for FRAME
function assertCryptoAvailable() {
  if (!crypto?.subtle) {
    throw new Error("Web Crypto API not available. Please use HTTPS or localhost.");
  }
}

export async function generateKeyPair() {
  assertCryptoAvailable();
  return await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"]
  );
}

export async function exportKeyPair(keyPair) {
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  
  return {
    publicKey: publicKeyJwk,
    privateKey: privateKeyJwk
  };
}

export async function importPrivateKey(privateKeyJwk) {
  return await crypto.subtle.importKey(
    'jwk',
    privateKeyJwk,
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    false,
    ['sign']
  );
}

export async function importPublicKey(publicKeyJwk) {
  return await crypto.subtle.importKey(
    'jwk',
    publicKeyJwk,
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    false,
    ['verify']
  );
}

export async function sign(privateKey, data) {
  assertCryptoAvailable();
  const message = typeof data === "string" ? new TextEncoder().encode(data) : data;
  return await crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" }
    },
    privateKey,
    message
  );
}

export async function verify(publicKey, signature, data) {
  assertCryptoAvailable();
  const message = typeof data === "string" ? new TextEncoder().encode(data) : data;
  return await crypto.subtle.verify(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" }
    },
    publicKey,
    signature,
    message
  );
}

export async function hash(data) {
  assertCryptoAvailable();
  const encoded = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
} 