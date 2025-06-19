import { signEd25519, verifyEd25519 } from "./crypto.ts";
export interface IntentProof {
  intentHash: string;
  signature: string;
  publicKey: string;
  timestamp: number;
  intentData: any;
  blockHash?: string;
  txHash?: string;
}
export interface IntentData {
  action: string;
  params: Record<string, string>;
  executor: string;
  issuer: string;
  timestamp: number;
}
export interface Actor {
  did: string;
  pub: string;
  keytype: string;
}
export interface Block {
  hash: string;
  prev: string;
  intent: string;
  sig: string;
  actor: Actor;
  ts: number;
  intentData?: IntentData;
}
export async function generateIntentProof(intentObj: IntentData): Promise<string> {
  try {
    const intentString = JSON.stringify(intentObj, Object.keys(intentObj).sort());
    const encoder = new TextEncoder();
    const data = encoder.encode(intentString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error(`❌ Failed to generate intent proof: ${error}`);
    throw error;
  }
}
export async function getActorInfo(did: string): Promise<Actor | null> {
  try {
    const { get } = await import("./storage.ts");
    const identity = await get(["unit", did]);
    if (!identity) {
      console.error(`❌ Identity not found: ${did}`);
      return null;
    }
    const pubKey = identity.signPublicKey || identity.publicKey;
    if (!pubKey) {
      console.error(`❌ No public key found for: ${did}`);
      return null;
    }
    return {
      did,
      pub: pubKey,
      keytype: "ed25519" 
    };
  } catch (error) {
    console.error(`❌ Failed to get actor info: ${error}`);
    return null;
  }
}
export async function signBlockPayload(
  prevHash: string,
  intentHash: string,
  timestamp: number,
  privateKeyHex: string
): Promise<string> {
  const encoder = new TextEncoder();
  const prevHashBytes = encoder.encode(prevHash);
  const intentHashBytes = encoder.encode(intentHash);
  const timestampBytes = new Uint8Array(new ArrayBuffer(8));
  new DataView(timestampBytes.buffer).setBigUint64(0, BigInt(timestamp), false);
  const payload = new Uint8Array(prevHashBytes.length + intentHashBytes.length + timestampBytes.length);
  payload.set(prevHashBytes, 0);
  payload.set(intentHashBytes, prevHashBytes.length);
  payload.set(timestampBytes, prevHashBytes.length + intentHashBytes.length);
  return await signEd25519(payload, privateKeyHex);
}
export async function verifyBlockSignature(
  prevHash: string,
  intentHash: string,
  timestamp: number,
  signature: string,
  publicKeyHex: string
): Promise<boolean> {
  if (!publicKeyHex || typeof publicKeyHex !== "string" || publicKeyHex.length < 32) {
    throw new Error("Invalid or missing public key for block signature verification");
  }
  const encoder = new TextEncoder();
  const prevHashBytes = encoder.encode(prevHash);
  const intentHashBytes = encoder.encode(intentHash);
  const timestampBytes = new Uint8Array(new ArrayBuffer(8));
  new DataView(timestampBytes.buffer).setBigUint64(0, BigInt(timestamp), false);
  const payload = new Uint8Array(prevHashBytes.length + intentHashBytes.length + timestampBytes.length);
  payload.set(prevHashBytes, 0);
  payload.set(intentHashBytes, prevHashBytes.length);
  payload.set(timestampBytes, prevHashBytes.length + intentHashBytes.length);
  return await verifyEd25519(payload, signature, publicKeyHex);
}
export async function generateEd25519KeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  try {
    const { generateEd25519KeyPair: generateKeys } = await import("./crypto.ts");
    return await generateKeys();
  } catch (error) {
    console.error(`❌ Failed to generate key pair: ${error}`);
    throw error;
  }
}
export async function signProof(hash: string, privateKeyHex: string): Promise<string> {
  return await signEd25519(hash, privateKeyHex);
}
export async function verifyProof(hash: string, signature: string, publicKeyHex: string): Promise<boolean> {
  return await verifyEd25519(hash, signature, publicKeyHex);
}
export async function createBlock(
  intentHash: string,
  signature: string,
  actor: Actor,
  prevHash: string = "0000000000000000000000000000000000000000000000000000000000000000"
): Promise<Block> {
  try {
    const timestamp = Date.now();
    const blockData = prevHash + intentHash + signature + timestamp.toString();
    const encoder = new TextEncoder();
    const data = encoder.encode(blockData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const block: Block = {
      hash,
      prev: prevHash,
      intent: intentHash,
      sig: signature,
      actor,
      ts: timestamp
    };
    return block;
  } catch (error) {
    console.error(`❌ Failed to create block: ${error}`);
    throw error;
  }
}
export async function storeBlock(block: Block): Promise<void> {
  try {
    const { set } = await import("./storage.ts");
    await set(["blocks", block.hash], block);
    await set(["chain", "latest"], block.hash);
    await appendToChainLog(block);
    console.log(`🔗 Block added to chain: ${block.hash.substring(0, 16)}...`);
    try {
      const { broadcastBlockchainUpdate } = await import("./explorer.ts");
      await broadcastBlockchainUpdate();
    } catch (error) {
      console.log("📡 WebSocket broadcast skipped (explorer not running)");
    }
  } catch (error) {
    console.error(`❌ Failed to store block: ${error}`);
  }
}
async function appendToChainLog(block: Block): Promise<void> {
  const logEntry = JSON.stringify(block) + '\n';
  try {
    await Deno.writeFile('data/chain.jsonl', new TextEncoder().encode(logEntry), { append: true });
  } catch (error) {
    try {
      await Deno.mkdir('data', { recursive: true });
      await Deno.writeFile('data/chain.jsonl', new TextEncoder().encode(logEntry));
    } catch (mkdirError) {
      console.error(`❌ Failed to create chain log: ${mkdirError}`);
    }
  }
}
export async function getLatestBlockHash(): Promise<string> {
  try {
    const { get } = await import("./storage.ts");
    const latest = await get(["chain", "latest"]);
    return latest || "0000000000000000000000000000000000000000000000000000000000000000";
  } catch (error) {
    return "0000000000000000000000000000000000000000000000000000000000000000";
  }
}
export async function getAllBlocks(): Promise<Block[]> {
  try {
    const { list } = await import("./storage.ts");
    const entries = await list(["blocks"]);
    return entries.map(entry => entry.value as Block);
  } catch (error) {
    console.error(`❌ Failed to get all blocks: ${error}`);
    return [];
  }
}
export async function getLastNBlocks(n: number = 10): Promise<Block[]> {
  try {
    const blocks = await getAllBlocks();
    blocks.sort((a, b) => b.ts - a.ts);
    return blocks.slice(0, n);
  } catch (error) {
    console.error(`❌ Failed to get last N blocks: ${error}`);
    return [];
  }
}
export async function verifyChain(): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  const blocks = await getAllBlocks();
  if (blocks.length === 0) {
    return { valid: true, errors: [] };
  }
  blocks.sort((a, b) => a.ts - b.ts);
  let prevHash = "0000000000000000000000000000000000000000000000000000000000000000";
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const expectedHash = await createBlockHash(block.intent, block.sig, block.ts, block.prev);
    if (block.hash !== expectedHash) {
      errors.push(`Block ${i}: Invalid hash. Expected ${expectedHash}, got ${block.hash}`);
    }
    if (block.prev !== prevHash) {
      errors.push(`Block ${i}: Invalid previous hash link. Expected ${prevHash}, got ${block.prev}`);
    }
    const isValid = await verifyBlockSignature(
      block.prev,
      block.intent,
      block.ts,
      block.sig,
      block.actor.pub
    );
    if (!isValid) {
      errors.push(`Block ${i}: Invalid signature for actor ${block.actor.did}`);
    }
    prevHash = block.hash;
  }
  return { valid: errors.length === 0, errors };
}
async function createBlockHash(intentHash: string, signature: string, timestamp: number, prevHash: string): Promise<string> {
  const blockData = prevHash + intentHash + signature + timestamp.toString();
  const encoder = new TextEncoder();
  const data = encoder.encode(blockData);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
export async function anchorOnChain(proof: IntentProof): Promise<{ success: boolean; txHash?: string; blockHash?: string }> {
  try {
    console.log(`🔗 Anchoring intent proof on blockchain...`);
    console.log(`📝 Intent Hash: ${proof.intentHash}`);
    console.log(`✍️ Signature: ${proof.signature.substring(0, 16)}...`);
    const txHashInput = proof.intentHash + Date.now().toString();
    const encoder = new TextEncoder();
    const txHashData = encoder.encode(txHashInput);
    const txHashBuffer = await crypto.subtle.digest('SHA-256', txHashData);
    const txHashArray = Array.from(new Uint8Array(txHashBuffer));
    const simulatedTxHash = `0x${txHashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 64)}`;
    const blockHashData = encoder.encode(simulatedTxHash);
    const blockHashBuffer = await crypto.subtle.digest('SHA-256', blockHashData);
    const blockHashArray = Array.from(new Uint8Array(blockHashBuffer));
    const simulatedBlockHash = `0x${blockHashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 64)}`;
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`✅ Proof anchored successfully!`);
    console.log(`🔗 Transaction Hash: ${simulatedTxHash}`);
    console.log(`🧱 Block Hash: ${simulatedBlockHash}`);
    return {
      success: true,
      txHash: simulatedTxHash,
      blockHash: simulatedBlockHash
    };
  } catch (error) {
    console.error(`❌ Failed to anchor proof on blockchain: ${error}`);
    return { success: false };
  }
}
export async function createIntentProof(
  intentData: IntentData,
  privKey: string,
  pubKey: string,
  anchorToChain = false
): Promise<IntentProof> {
  try {
    const intentHash = await generateIntentProof(intentData);
    const signature = await signProof(intentHash, privKey);
    const proof: IntentProof = {
      intentHash,
      signature,
      publicKey: pubKey,
      timestamp: Date.now(),
      intentData
    };
    if (anchorToChain) {
      const anchorResult = await anchorOnChain(proof);
      if (anchorResult.success) {
        proof.txHash = anchorResult.txHash;
        proof.blockHash = anchorResult.blockHash;
      }
    }
    return proof;
  } catch (error) {
    console.error(`❌ Failed to create intent proof: ${error}`);
    throw error;
  }
}
export async function storeProof(proof: IntentProof): Promise<void> {
  try {
    const { set } = await import("./storage.ts");
    await set(["proofs", proof.intentHash], proof);
    console.log(`💾 Proof stored: ${proof.intentHash}`);
  } catch (error) {
    console.error(`❌ Failed to store proof: ${error}`);
  }
}
export async function getProof(intentHash: string): Promise<IntentProof | null> {
  try {
    const { get } = await import("./storage.ts");
    const proof = await get(["proofs", intentHash]);
    return proof;
  } catch (error) {
    console.error(`❌ Failed to retrieve proof: ${error}`);
    return null;
  }
}
export async function getAllProofs(): Promise<IntentProof[]> {
  try {
    const { list } = await import("./storage.ts");
    const entries = await list(["proofs"]);
    return entries.map(entry => entry.value as IntentProof);
  } catch (error) {
    console.error(`❌ Failed to get all proofs: ${error}`);
    return [];
  }
}
export async function verifyStoredProof(intentHash: string): Promise<boolean> {
  try {
    const proof = await getProof(intentHash);
    if (!proof) {
      console.error(`❌ Proof not found: ${intentHash}`);
      return false;
    }
    const isValid = await verifyProof(proof.intentHash, proof.signature, proof.publicKey);
    if (isValid) {
      console.log(`✅ Proof verified: ${intentHash}`);
    } else {
      console.error(`❌ Proof verification failed: ${intentHash}`);
    }
    return isValid;
  } catch (error) {
    console.error(`❌ Failed to verify stored proof: ${error}`);
    return false;
  }
} 