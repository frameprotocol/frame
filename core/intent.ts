import { readAllCaps } from "./cap_index.ts";
import { getTrustScore } from "./trust.ts";
import { appendLog } from "./utils.ts";
import { runCapability } from "../runtime/caps.ts";
import { verifyCapSignature, loadCap } from "./capabilities.ts";
import * as storage from "./storage.ts";
export function parseIntentUrl(url: string): { action: string; params: Record<string, string> } {
  try {
    const withoutScheme = url.replace(/^intent:\/\//, '');
    const [action, queryString] = withoutScheme.split('?');
    const params: Record<string, string> = {};
    if (queryString) {
      const pairs = queryString.split('&');
      for (const pair of pairs) {
        const [key, value] = pair.split('=');
        if (key && value) {
          params[key] = decodeURIComponent(value);
        }
      }
    }
    return { action, params };
  } catch (error) {
    return { action: url, params: {} };
  }
}
export async function resolveIntent(intent: string, params?: Record<string, string>, useKv = false) {
  const caps = await readAllCaps(useKv);
  const now = Date.now();
  const validCaps = [];
  for (const cap of caps) {
    if (cap.action !== intent) continue;
    if (cap.revoked) continue;
    if (cap.expires_at && Date.parse(cap.expires_at) < now) continue;
    if (await verifyCapSignature(cap, useKv)) {
      validCaps.push(cap);
    } else {
      console.warn(`⚠️ Skipping invalid capability: ${cap.action} -> ${cap.audience}`);
    }
  }
  if (validCaps.length === 0) {
    console.log(`❌ No agents found for intent: ${intent}`);
    return [];
  }
  const scored = await Promise.all(validCaps.map(async cap => {
    const trust = await getTrustScore("alice", cap.audience, useKv);
    return { cap, trust };
  }));
  scored.sort((a, b) => b.trust - a.trust);
  for (const { cap, trust } of scored) {
    const score = Math.floor(trust * 100);
    let output = `🧠 Found: ${cap.audience} | Trust: ${score}/100 | Issuer: ${cap.issuer}`;
    if (params && Object.keys(params).length > 0) {
      const paramString = Object.entries(params)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ');
      output += ` | Params: ${paramString}`;
    }
    console.log(output);
  }
  return scored;
}
export async function executeIntent(intentName: string, params: Record<string, string>, useKv = false) {
  console.log(`🔍 Resolving intent: ${intentName}`);
  const matches = await resolveIntent(intentName, params, useKv);
  if (matches.length === 0) {
    console.log(`❌ No agents found to execute intent: ${intentName}`);
    return;
  }
  const bestMatch = matches[0];
  const executor = bestMatch.cap.audience;
  const issuer = bestMatch.cap.issuer;
  const executorName = executor.replace('did:frame:', '');
  const issuerName = issuer.replace('did:frame:', '');
  console.log(`💥 Executing ${intentName} using ${executor}`);
  console.log(`Params: ${Object.entries(params).map(([key, value]) => `${key}=${value}`).join(', ')}`);
  runCapability(intentName, params);
  console.log(`📝 Logging to issuer: ${issuerName}`);
  await appendLog(issuerName, {
    action: "intent_executed",
    actor: issuerName,
    details: {
      intent: intentName,
      executor: executor,
      params: params
    }
  }, useKv);
  console.log(`📝 Logging to executor: ${executorName}`);
  await appendLog(executorName, {
    action: "intent_executed_by",
    actor: executorName,
    details: {
      intent: intentName,
      issuer: issuer,
      params: params
    }
  }, useKv);
  console.log(`✅ Intent ${intentName} executed successfully`);
}