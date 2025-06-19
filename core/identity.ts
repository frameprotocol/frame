import { ensureDir, writeJson, appendLog, generateKeyPair, sign, verify } from "./utils.ts";
import * as storage from "./storage.ts";
import { generateEd25519KeyPair } from "./crypto.ts";
function getUnitKey(nameOrDid: string) {
  return ["unit", nameOrDid.startsWith("did:frame:") ? nameOrDid : `did:frame:${nameOrDid}`];
}
interface FrameUnit {
  did: string;
  name: string;
  signing: {
    publicKey: string;
    privateKey: string;
  };
  encryption: {
    publicKey: string;
    privateKey: string;
  };
  created_at: string;
  signature?: string;
  parent_did?: string;
  signPublicKey: string;
  signPrivateKey: string;
}
async function createIdentity(name: string, useKv = false) {
  const cleanName = extractNameFromDid(name);
  const did = `did:frame:${cleanName}`;
  const keyPair = await generateKeyPair();
  const ed25519 = await generateEd25519KeyPair();
  const unit: FrameUnit = {
    did,
    name: cleanName,
    signing: {
      publicKey: keyPair.signPublicKey, 
      privateKey: keyPair.signPrivateKey, 
    },
    encryption: {
      publicKey: keyPair.publicKey, 
      privateKey: keyPair.privateKey, 
    },
    created_at: new Date().toISOString(),
    signPublicKey: ed25519.publicKey,
    signPrivateKey: ed25519.privateKey,
  };
  const signature = await sign(unit, unit.signing.privateKey);
  unit.signature = signature;
  if (useKv) {
    await storage.set(getUnitKey(did), unit);
  } else {
    const path = `data/units/${cleanName}.json`;
    await ensureDir("data/units");
    await writeJson(path, unit);
  }
  await appendLog(cleanName, {
    action: "create",
    actor: cleanName,
    details: { did: did }
  }, useKv);
  console.log(`✅ Created identity: ${did}`);
}
function extractNameFromDid(didOrName: string): string {
  if (didOrName.startsWith('did:frame:')) {
    return didOrName.replace('did:frame:', '');
  }
  return didOrName;
}
async function loadIdentity(name: string, useKv = false) {
  const cleanName = extractNameFromDid(name);
  const did = `did:frame:${cleanName}`;
  if (useKv) {
    return await storage.get(getUnitKey(did));
  } else {
    const path = `data/units/${cleanName}.json`;
    return JSON.parse(await Deno.readTextFile(path));
  }
}
async function forkIdentity(parent: string, child: string, useKv = false) {
  const cleanParent = extractNameFromDid(parent);
  const cleanChild = extractNameFromDid(child);
  const parentUnit = await loadIdentity(cleanParent, useKv);
  if (!await verifyUnitSignature(parentUnit)) {
    console.error(`❌ Invalid signature for parent identity: ${cleanParent}`);
    return;
  }
  const childDID = `did:frame:${cleanChild}`;
  const keyPair = await generateKeyPair();
  const forked: FrameUnit = {
    did: childDID,
    name: cleanChild,
    signing: {
      publicKey: keyPair.signPublicKey, 
      privateKey: keyPair.signPrivateKey, 
    },
    encryption: {
      publicKey: keyPair.publicKey, 
      privateKey: keyPair.privateKey, 
    },
    created_at: new Date().toISOString(),
    parent_did: parentUnit.did,
    signPublicKey: parentUnit.signPublicKey,
    signPrivateKey: parentUnit.signPrivateKey,
  };
  const signature = await sign(forked, forked.signing.privateKey);
  forked.signature = signature;
  if (useKv) {
    await storage.set(getUnitKey(childDID), forked);
  } else {
    const path = `data/units/${cleanChild}.json`;
    await ensureDir("data/units");
    await writeJson(path, forked);
  }
  await appendLog(cleanParent, {
    action: "fork",
    actor: cleanParent,
    details: { forked: childDID }
  }, useKv);
  await appendLog(cleanChild, {
    action: "forked_from",
    actor: cleanChild,
    details: { parent: parentUnit.did }
  }, useKv);
  console.log(`🌱 Forked ${cleanParent} → ${cleanChild}`);
}
async function mergeIdentities(from: string, target: string, useKv = false) {
  const cleanFrom = extractNameFromDid(from);
  const cleanTarget = extractNameFromDid(target);
  const fromUnit = await loadIdentity(cleanFrom, useKv);
  const toUnit = await loadIdentity(cleanTarget, useKv);
  if (!await verifyUnitSignature(fromUnit)) {
    console.error(`❌ Invalid signature for source identity: ${cleanFrom}`);
    return;
  }
  if (!await verifyUnitSignature(toUnit)) {
    console.error(`❌ Invalid signature for target identity: ${cleanTarget}`);
    return;
  }
  await appendLog(cleanFrom, {
    action: "merged_into",
    actor: cleanFrom,
    details: { target_did: toUnit.did }
  }, useKv);
  await appendLog(cleanTarget, {
    action: "merged_from",
    actor: cleanTarget,
    details: { source_did: fromUnit.did }
  }, useKv);
  console.log(`🔀 Merged ${cleanFrom} → ${cleanTarget}`);
}
export async function verifyUnitSignature(unit: any): Promise<boolean> {
  if (!unit.signature || !unit.signing?.publicKey) {
    console.error("❌ FrameUnit missing signature or ECDSA public key");
    return false;
  }
  const isValid = await verify(unit, unit.signature, unit.signing.publicKey);
  if (!isValid) {
    console.error(`❌ Invalid signature for FrameUnit: ${unit.did}`);
  }
  return isValid;
}
export async function repairIdentities(useKv = false) {
  const { list, set } = await import("./storage.ts");
  const units = await list(["unit"]);
  let repaired = 0;
  for (const entry of units) {
    const identity = entry.value;
    if (!identity.signPublicKey || !identity.signPrivateKey) {
      const ed25519 = await generateEd25519KeyPair();
      identity.signPublicKey = ed25519.publicKey;
      identity.signPrivateKey = ed25519.privateKey;
      await set(["unit", identity.did], identity);
      repaired++;
    }
  }
  console.log(`🔧 Repaired ${repaired} identities with Ed25519 keys`);
}
if (import.meta.main) {
  const args = Deno.args;
  if (args[0] === "repair-identities" && args.includes("--kv")) {
    await repairIdentities(true);
    Deno.exit(0);
  }
}
export {
  createIdentity,
  loadIdentity,
  forkIdentity,
  mergeIdentities,
  getUnitKey,
};