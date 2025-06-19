import { ensureDir, writeJson } from "./utils.ts";
import * as storage from "./storage.ts";
function getTrustKey(from: string) {
  return ["trust", from];
}
function getHandleKey(handle: string) {
  return ["handle", handle.startsWith('@') ? handle.slice(1) : handle];
}
export async function trustIdentity(from: string, to: string, score: number, useKv = false) {
  if (useKv) {
    let trust = await storage.get(getTrustKey(from)) || {};
    trust.trusted ??= {};
    trust.trusted[`did:frame:${to}`] = score;
    await storage.set(getTrustKey(from), trust);
  } else {
    const path = `data/trust/${from}.json`;
    await ensureDir("data/trust");
    let trust = {};
    try {
      trust = JSON.parse(await Deno.readTextFile(path));
    } catch {}
    trust.trusted ??= {};
    trust.trusted[`did:frame:${to}`] = score;
    await writeJson(path, trust);
  }
  console.log(`🫱 ${from} now trusts ${to} (score: ${score})`);
}
export async function getTrustScore(from: string, toDid: string, useKv = false): Promise<number> {
  if (useKv) {
    const trust = await storage.get(getTrustKey(from));
    return trust?.trusted?.[toDid] ?? 0.5;
  } else {
    const path = `data/trust/${from}.json`;
    try {
      const trust = JSON.parse(await Deno.readTextFile(path));
      return trust.trusted?.[toDid] ?? 0.5;
    } catch {
      return 0.5;
    }
  }
}
export async function claimHandle(identity: string, handle: string, useKv = false) {
  const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;
  if (useKv) {
    let claims: Array<{did: string, claimed_at: string, score: number}> = await storage.get(getHandleKey(handle)) || [];
    if (!Array.isArray(claims)) claims = [];
    const existingIndex = claims.findIndex(claim => claim.did === `did:frame:${identity}`);
    if (existingIndex >= 0) {
      claims[existingIndex].claimed_at = new Date().toISOString();
      claims[existingIndex].score = await calculateHandleScore(identity, useKv);
    } else {
      claims.push({
        did: `did:frame:${identity}`,
        claimed_at: new Date().toISOString(),
        score: await calculateHandleScore(identity, useKv)
      });
    }
    claims.sort((a, b) => b.score - a.score);
    await storage.set(getHandleKey(handle), claims);
    console.log(`🏷️ ${identity} claimed @${cleanHandle} (score: ${claims.find(c => c.did === `did:frame:${identity}`)?.score.toFixed(2)})`);
  } else {
    const path = `data/trust/${cleanHandle}.json`;
    await ensureDir("data/trust");
    let claims: Array<{did: string, claimed_at: string, score: number}> = [];
    try {
      const fileContent = await Deno.readTextFile(path);
      claims = JSON.parse(fileContent);
      if (!Array.isArray(claims)) {
        claims = [];
      }
    } catch {
      claims = [];
    }
    const existingIndex = claims.findIndex(claim => claim.did === `did:frame:${identity}`);
    if (existingIndex >= 0) {
      claims[existingIndex].claimed_at = new Date().toISOString();
      claims[existingIndex].score = await calculateHandleScore(identity, useKv);
    } else {
      claims.push({
        did: `did:frame:${identity}`,
        claimed_at: new Date().toISOString(),
        score: await calculateHandleScore(identity, useKv)
      });
    }
    claims.sort((a, b) => b.score - a.score);
    await writeJson(path, claims);
    console.log(`🏷️ ${identity} claimed @${cleanHandle} (score: ${claims.find(c => c.did === `did:frame:${identity}`)?.score.toFixed(2)})`);
  }
}
export async function whois(handle: string, useKv = false) {
  const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;
  if (useKv) {
    const claims = await storage.get(getHandleKey(handle)) || [];
    if (claims.length === 0) {
      console.log(`❌ No claims found for @${cleanHandle}`);
      return;
    }
    const topClaim = claims[0];
    console.log(`🔍 @${cleanHandle} resolves to: ${topClaim.did}`);
    console.log(`📊 Score: ${topClaim.score.toFixed(2)}`);
    console.log(`📅 Claimed: ${topClaim.claimed_at}`);
    console.log(`🏆 Rank: 1/${claims.length} claims`);
    if (claims.length > 1) {
      console.log(`\n📋 All claims:`);
      claims.forEach((claim, index) => {
        console.log(`  ${index + 1}. ${claim.did} (score: ${claim.score.toFixed(2)})`);
      });
    }
  } else {
    const path = `data/trust/${cleanHandle}.json`;
    try {
      const claims = JSON.parse(await Deno.readTextFile(path));
      if (claims.length === 0) {
        console.log(`❌ No claims found for @${cleanHandle}`);
        return;
      }
      const topClaim = claims[0];
      console.log(`🔍 @${cleanHandle} resolves to: ${topClaim.did}`);
      console.log(`📊 Score: ${topClaim.score.toFixed(2)}`);
      console.log(`📅 Claimed: ${topClaim.claimed_at}`);
      console.log(`🏆 Rank: 1/${claims.length} claims`);
      if (claims.length > 1) {
        console.log(`\n📋 All claims:`);
        claims.forEach((claim, index) => {
          console.log(`  ${index + 1}. ${claim.did} (score: ${claim.score.toFixed(2)})`);
        });
      }
    } catch {
      console.log(`❌ No claims found for @${cleanHandle}`);
    }
  }
}
async function calculateHandleScore(identity: string, useKv = false): Promise<number> {
  let score = 0.0;
  if (useKv) {
    try {
      const trust = await storage.get(getTrustKey(identity));
      const trustCount = Object.keys(trust?.trusted || {}).length;
      score += trustCount * 0.1;
    } catch {}
    try {
      const log = await storage.get(`log:${identity}`);
      const activityCount = Array.isArray(log) ? log.length : 0;
      score += activityCount * 0.05;
    } catch {}
    try {
      const unit = await storage.get(`unit:did:frame:${identity}`);
      if (unit?.parent_did) {
        score += 0.2;
      }
    } catch {}
  } else {
    try {
      const trustPath = `data/trust/${identity}.json`;
      const trust = JSON.parse(await Deno.readTextFile(trustPath));
      const trustCount = Object.keys(trust.trusted || {}).length;
      score += trustCount * 0.1;
    } catch {}
    try {
      const logPath = `data/logs/${identity}.log`;
      const logContent = await Deno.readTextFile(logPath);
      const logLines = logContent.trim().split('\n').filter(line => line.length > 0);
      const activityCount = logLines.length;
      score += activityCount * 0.05;
    } catch {}
    try {
      const unitPath = `data/units/${identity}.json`;
      const unit = JSON.parse(await Deno.readTextFile(unitPath));
      if (unit.parent_did) {
        score += 0.2;
      }
    } catch {}
  }
  return Math.min(score, 1.0);
}