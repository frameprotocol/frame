import { ensureDir, writeJson, appendLog, sign, verify } from "./utils.ts";
import * as storage from "./storage.ts";
import { getUnitKey, loadIdentity } from "./identity.ts";
import { signEd25519, verifyEd25519 } from "./crypto.ts";
import { get as getFromStorage, set as setInStorage, list as listFromStorage } from "./storage.ts";
import { getActorInfo } from "./proof.ts";
function extractNameFromDid(didOrName: string): string {
  if (didOrName.startsWith('did:frame:')) {
    return didOrName.replace('did:frame:', '');
  }
  return didOrName;
}
export function getCapKey(action: string, grantee: string): string[] {
  return ["cap", action, grantee];
}
export async function grantCapability(from: string, to: string, action: string, expires_at: string | null = null, useKv = false) {
  const cleanFrom = extractNameFromDid(from);
  const cleanTo = extractNameFromDid(to);
  const issuer = await loadIdentity(cleanFrom, useKv);
  const recipient = await loadIdentity(cleanTo, useKv);
  if (!issuer || !recipient) {
    throw new Error("Could not load issuer or recipient identity.");
  }
  const cap: any = {
    issuer: issuer.did,
    audience: `did:frame:${cleanTo}`,
    action,
    issued_at: new Date().toISOString(),
    expires_at,
  };
  const signature = await sign(cap, issuer.signing.privateKey);
  cap.signature = signature;
  if (useKv) {
    await storage.set(getCapKey(action, cleanTo), cap);
  } else {
    const capId = `${action}-${cleanTo}.json`;
    await ensureDir("data/caps");
    await writeJson(`data/caps/${capId}`, cap);
  }
  await appendLog(cleanFrom, {
    action: "grant",
    actor: cleanFrom,
    details: {
      action,
      granted_to: cleanTo,
      expires_at
    }
  }, useKv);
  console.log(`🔑 Granted "${action}" to ${cleanTo}`);
}
export async function loadCap(action: string, to: string, useKv = false) {
  if (useKv) {
    return await storage.get(getCapKey(action, to));
  } else {
    const capId = `${action}-${to}.json`;
    const path = `data/caps/${capId}`;
    return JSON.parse(await Deno.readTextFile(path));
  }
}
export async function revokeCapability(from: string, to: string, action: string, useKv = false) {
  const cleanFrom = extractNameFromDid(from);
  const cleanTo = extractNameFromDid(to);
  let cap = await loadCap(action, cleanTo, useKv);
  if (!cap) {
    console.error(`❌ Could not read capability: ${action} -> ${cleanTo}`);
    return;
  }
  if (!await verifyCapSignature(cap, useKv)) {
    console.error(`❌ Invalid signature for capability: ${action} -> ${cleanTo}`);
    return;
  }
  cap.revoked = true;
  cap.revoked_at = new Date().toISOString();
  const issuerName = cap.issuer.replace('did:frame:', '');
  const issuer = await loadIdentity(issuerName, useKv);
  if (!issuer) {
    console.error(`❌ Could not load issuer identity: ${issuerName}`);
    return;
  }
  const newSignature = await sign(cap, issuer.signing.privateKey);
  cap.signature = newSignature;
  if (useKv) {
    await storage.set(getCapKey(action, cleanTo), cap);
  } else {
    const capId = `${action}-${cleanTo}.json`;
    await writeJson(`data/caps/${capId}`, cap);
  }
  await appendLog(cleanFrom, {
    action: "revoke",
    actor: cleanFrom,
    details: { action, from: cleanTo }
  }, useKv);
  console.log(`🛑 Revoked "${action}" from ${cleanTo}`);
}
export async function verifyCapSignature(cap: any, useKv = false): Promise<boolean> {
  if (!cap.signature || !cap.issuer) {
    console.error("❌ CapGrant missing signature or issuer");
    return false;
  }
  try {
    const issuerName = cap.issuer.replace('did:frame:', '');
    const issuer = await loadIdentity(issuerName, useKv);
    if (!issuer || !issuer.signing?.publicKey) {
      console.error(`❌ Issuer missing signing public key: ${cap.issuer}`);
      return false;
    }
    const isValid = await verify(cap, cap.signature, issuer.signing.publicKey);
    if (!isValid) {
      console.error(`❌ Invalid signature for CapGrant: ${cap.action} -> ${cap.audience}`);
    }
    return isValid;
  } catch (error) {
    console.error(`❌ Could not verify CapGrant signature: ${error}`);
    return false;
  }
}
async function signCapabilityGrant(grant: any, issuerDid: string): Promise<string> {
  const grantCopy = { ...grant };
  delete grantCopy.signature;
  const dataString = JSON.stringify(grantCopy, Object.keys(grantCopy).sort());
  const issuer = await getFromStorage(["unit", issuerDid]);
  if (!issuer || !issuer.signPrivateKey) throw new Error(`No private key for ${issuerDid}`);
  return await signEd25519(dataString, issuer.signPrivateKey);
}
async function verifyCapabilityGrant(grant: any): Promise<boolean> {
  const grantCopy = { ...grant };
  const signature = grantCopy.signature;
  delete grantCopy.signature;
  const dataString = JSON.stringify(grantCopy, Object.keys(grantCopy).sort());
  const issuer = await getFromStorage(["unit", grant.issuer]);
  if (!issuer || !issuer.signPublicKey) return false;
  return await verifyEd25519(dataString, signature, issuer.signPublicKey);
}
export async function repairCaps(useKv = false) {
  const caps = await listFromStorage(["cap"]);
  let repaired = 0;
  for (const entry of caps) {
    const cap = entry.value;
    if (!cap.signature || !(await verifyCapabilityGrant(cap))) {
      cap.signature = await signCapabilityGrant(cap, cap.issuer);
      await setInStorage(entry.key, cap);
      repaired++;
    }
  }
  console.log(`🔧 Repaired ${repaired} capabilities with Ed25519 signatures`);
}
export async function verifyCapability(issuerDid: string, audienceDid: string, action: string, useKv = false): Promise<boolean> {
  try {
    const issuerName = extractNameFromDid(issuerDid);
    const audienceName = extractNameFromDid(audienceDid);
    const cap = await loadCap(action, audienceName, useKv);
    if (!cap) {
      return false;
    }
    if (cap.revoked) {
      return false;
    }
    if (cap.expires_at && new Date(cap.expires_at) < new Date()) {
      return false;
    }
    const isValidSignature = await verifyCapSignature(cap, useKv);
    if (!isValidSignature) {
      return false;
    }
    if (cap.issuer !== issuerDid || cap.audience !== audienceDid) {
      return false;
    }
    return true;
  } catch (error) {
    console.error(`❌ Error verifying capability: ${error}`);
    return false;
  }
}
export async function listCapabilities(useKv = false): Promise<any[]> {
  if (useKv) {
    const entries = await storage.list(["cap"]);
    return entries.map(entry => entry.value);
  } else {
    return [];
  }
}
export async function purgeInvalidCapabilities(useKv = false): Promise<number> {
  const all = await listCapabilities(useKv);
  let removed = 0;
  for (const cap of all) {
    const valid = await verifyCapSignature(cap, useKv);
    if (!valid) {
      const audienceName = extractNameFromDid(cap.audience);
      const key = getCapKey(cap.action, audienceName);
      await storage.del(key);
      removed++;
      console.log(`🗑️ Removed invalid cap: ${cap.action} -> ${cap.audience}`);
    }
  }
  console.log(`✅ Purged ${removed} invalid capabilities`);
  return removed;
}
if (import.meta.main) {
  const args = Deno.args;
  if (args[0] === "repair-caps" && args.includes("--kv")) {
    await repairCaps(true);
    Deno.exit(0);
  }
}