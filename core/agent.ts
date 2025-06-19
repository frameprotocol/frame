import { resolveIntent, executeIntent } from "./intent.ts";
import { loadIdentity } from "./identity.ts";
import { appendLog } from "./utils.ts";
import * as storage from "./storage.ts";
import { getTrustScore } from "./trust.ts";
import { startGossip } from "./gossip.ts";
import { getInbox, handleMessage, getUnreadCount, decryptMessagePayload } from "./message.ts";
import { voteOnIntent } from "./negotiator.ts";
import { addPeer } from "./peers.ts";
import { getAllBlocks, getLatestBlockHash, verifyBlockSignature } from "./proof.ts";
import { verifyCapability } from "./capabilities.ts";
import { checkReflexRules } from "./reflex.ts";
interface ChainListener {
  isRunning: boolean;
  lastProcessedBlock: string;
  agentName: string;
}
let chainListeners = new Map<string, ChainListener>();
export async function runAgent(name: string, useKv = false, options: {
  peers?: string[];
  serve?: boolean;
  port?: number;
  enableChainListener?: boolean;
} = {}) {
  console.log(`🤖 Agent started: ${name}`);
  const identity = await loadIdentity(name, useKv);
  if (!identity) {
    console.error(`❌ Identity not found: ${name}`);
    return;
  }
  console.log(`🆔 Agent identity: ${identity.did}`);
  const pubKey = identity.signPublicKey || identity.signing?.publicKey || "UNKNOWN";
  console.log(`🔑 Public key: ${pubKey.substring(0, 16)}...`);
  if (options.serve && options.peers && options.peers.length > 0) {
    const port = options.port || 7001;
    console.log(`🌐 Starting gossip server on port ${port} with peers: ${options.peers.join(', ')}`);
    for (const peer of options.peers) {
      await addPeer(peer);
    }
    await startGossip(identity.did, port);
  }
  if (options.enableChainListener) {
    await startChainListener(name, useKv);
  }
  console.log(`⏰ Polling for intents every 5 seconds...`);
  console.log(`💤 Press Ctrl+C to stop the agent\n`);
  await appendLog(name, {
    action: "agent_started",
    actor: name,
    details: { 
      agent_id: identity.did,
      started_at: new Date().toISOString(),
      peers: options.peers || [],
      serving: options.serve || false,
      chain_listener: options.enableChainListener || false
    }
  }, useKv);
  let cycleCount = 0;
  while (true) {
    cycleCount++;
    console.log(`🔄 Cycle ${cycleCount} - ${new Date().toLocaleTimeString()}`);
    try {
      const unreadCount = await getUnreadCount(identity.did, useKv);
      if (unreadCount > 0) {
        console.log(`📨 Processing ${unreadCount} unread messages...`);
        const inbox = await getInbox(identity.did, useKv);
        const unreadMessages = inbox.filter(msg => !msg.read);
        for (const msg of unreadMessages) {
          if (msg.encrypted) {
            console.log(`🔐 ${name} received encrypted message from ${msg.from}`);
            try {
              const decryptedPayload = await decryptMessagePayload(msg, name, useKv);
              console.log(`📨 Decrypted content: ${JSON.stringify(decryptedPayload)}`);
              const decryptedMsg = {
                ...msg,
                payload: decryptedPayload,
                originalPayload: msg.payload 
              };
              if (decryptedMsg.type === "intent_proposal") {
                console.log(`🤝 ${name} received encrypted proposal from ${msg.from}: ${decryptedPayload.intent} — ${decryptedPayload.reason}`);
                const trust = await getTrustScore(name, msg.from.replace('did:frame:', ''), useKv);
                if (trust >= 0.5) {
                  await voteOnIntent(name, msg.from, decryptedPayload.intent, "yes", useKv);
                  console.log(`🗳️ Auto-voted YES on encrypted ${decryptedPayload.intent} from ${msg.from}`);
                } else {
                  console.log(`⏩ Skipped vote on encrypted ${decryptedPayload.intent} — low trust (${trust})`);
                }
              } else if (decryptedMsg.type === "intent_vote") {
                console.log(`🗳️ ${name} received encrypted vote from ${msg.from} on ${decryptedPayload.intent}: ${decryptedPayload.vote}`);
              } else {
                console.log(`📨 Encrypted message from ${msg.from}: ${decryptedMsg.type}`);
                await handleMessage(decryptedMsg, name, useKv);
              }
            } catch (error) {
              console.error(`🔐 Failed to decrypt message from ${msg.from}: ${error}`);
            }
          } else {
            if (msg.type === "intent_proposal") {
              console.log(`🤝 ${name} received proposal from ${msg.from}: ${msg.payload.intent} — ${msg.payload.reason}`);
              const trust = await getTrustScore(name, msg.from.replace('did:frame:', ''), useKv);
              if (trust >= 0.5) {
                await voteOnIntent(name, msg.from, msg.payload.intent, "yes", useKv);
                console.log(`🗳️ Auto-voted YES on ${msg.payload.intent} from ${msg.from}`);
              } else {
                console.log(`⏩ Skipped vote on ${msg.payload.intent} — low trust (${trust})`);
              }
            } else if (msg.type === "intent_vote") {
              console.log(`🗳️ ${name} received vote from ${msg.from} on ${msg.payload.intent}: ${msg.payload.vote}`);
            } else {
              console.log(`📨 Message from ${msg.from}: ${msg.type}`);
              await handleMessage(msg, name, useKv);
            }
          }
        }
      }
      const intents = await fetchPendingIntents(useKv);
      if (intents.length === 0) {
        console.log(`  💤 No pending intents found`);
      } else {
        console.log(`🔍 Checking ${intents.length} pending intents...`);
        for (const intent of intents) {
          const matches = (await resolveIntent(intent.action, intent.params, useKv)) as any[];
          const myMatch = matches.find(match => match.cap && match.cap.audience === identity.did);
          if (!myMatch) {
            console.log(`⏩ Skipped: ${intent.url}\n   Reason: No capability match`);
            await appendLog(name, {
              action: "intent_skipped",
              actor: name,
              details: { intent: intent.url, reason: "No capability match" }
            }, useKv);
            continue;
          }
          const trustScore = await getTrustScore(name, myMatch.cap.issuer, useKv);
          if (trustScore < 0.5) {
            console.log(`⏩ Skipped: ${intent.url}\n   Reason: Low trust (${trustScore.toFixed(2)})`);
            await appendLog(name, {
              action: "intent_skipped",
              actor: name,
              details: { intent: intent.url, reason: `Low trust (${trustScore.toFixed(2)})` }
            }, useKv);
            continue;
          }
          try {
            await executeIntent(intent.action, intent.params as Record<string, string>, useKv);
            await markIntentProcessed(intent.id, name, useKv);
            await incrementReputation(name, useKv);
            const newRep = await getReputation(name, useKv);
            console.log(`✅ Executed: ${intent.url}\n   Score: +0.2 reputation (now ${newRep.toFixed(2)})`);
            await appendLog(name, {
              action: "intent_executed",
              actor: name,
              details: { intent: intent.url, reputation: newRep }
            }, useKv);
          } catch (error) {
            console.error(`  💥 Error executing intent: ${error}`);
            await appendLog(name, {
              action: "intent_error",
              actor: name,
              details: { intent: intent.url, error: error?.toString() }
            }, useKv);
          }
        }
      }
      await checkReflexRules(name, useKv);
    } catch (error) {
      console.error(`💥 Agent cycle error: ${error}`);
    }
    await delay(5000);
  }
}
async function fetchPendingIntents(useKv = false): Promise<Array<{id: string, url: string, action: string, params: Record<string, string>}>> {
  if (useKv) {
    const pendingIntents = await storage.get(["pending_intents"]) || [];
    if (pendingIntents.length === 0 && Math.random() < 0.1) {
      const testIntents = [
        {
          id: `intent_${Date.now()}_1`,
          url: 'intent://access.door?room=garage',
          action: 'access.door',
          params: { room: 'garage' } as Record<string, string>,
          created_at: new Date().toISOString()
        },
        {
          id: `intent_${Date.now()}_2`, 
          url: 'intent://pay.gas?amount=5',
          action: 'pay.gas',
          params: { amount: '5' } as Record<string, string>,
          created_at: new Date().toISOString()
        }
      ];
      await storage.set(["pending_intents"], testIntents);
      return testIntents;
    }
    return pendingIntents.map((intent: any) => ({
      ...intent,
      params: intent.params || {}
    }));
  } else {
    return [];
  }
}
async function markIntentProcessed(intentId: string, agentName: string, useKv = false) {
  if (useKv) {
    const pendingIntents = await storage.get(["pending_intents"]) || [];
    const filtered = pendingIntents.filter((intent: any) => intent.id !== intentId);
    await storage.set(["pending_intents"], filtered);
    const processedIntents = await storage.get(["processed_intents"]) || [];
    processedIntents.push({
      intent_id: intentId,
      processed_by: agentName,
      processed_at: new Date().toISOString()
    });
    await storage.set(["processed_intents"], processedIntents);
  }
}
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
export async function submitIntent(url: string, useKv = false) {
  const intentId = `intent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const { action, params } = parseIntentUrl(url);
  const intent = {
    id: intentId,
    url,
    action,
    params,
    submitted_at: new Date().toISOString()
  };
  if (useKv) {
    const pendingIntents = await storage.get(["pending_intents"]) || [];
    pendingIntents.push(intent);
    await storage.set(["pending_intents"], pendingIntents);
    console.log(`📤 Intent submitted: ${url}`);
  } else {
    console.log(`📤 Intent submitted (file mode): ${url}`);
  }
  return intentId;
}
function parseIntentUrl(url: string): { action: string; params: Record<string, string> } {
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
async function getReputation(name: string, useKv = false): Promise<number> {
  if (useKv) {
    return (await storage.get(["reputation", name])) ?? 0;
  }
  return 0;
}
async function incrementReputation(name: string, useKv = false) {
  if (useKv) {
    const rep = (await storage.get(["reputation", name])) ?? 0;
    await storage.set(["reputation", name], rep + 0.2);
  }
}
export async function startChainListener(agentName: string, useKv = false): Promise<void> {
  if (chainListeners.has(agentName)) {
    console.log(`🔄 Chain listener already running for ${agentName}`);
    return;
  }
  const listener: ChainListener = {
    isRunning: true,
    lastProcessedBlock: await getLatestBlockHash(),
    agentName
  };
  chainListeners.set(agentName, listener);
  chainListenerLoop(agentName, useKv);
  console.log(`👂 Started chain listener for agent: ${agentName}`);
}
export async function stopChainListener(agentName: string): Promise<void> {
  const listener = chainListeners.get(agentName);
  if (listener) {
    listener.isRunning = false;
    chainListeners.delete(agentName);
    console.log(`🛑 Stopped chain listener for agent: ${agentName}`);
  }
}
async function chainListenerLoop(agentName: string, useKv = false): Promise<void> {
  const listener = chainListeners.get(agentName);
  if (!listener) return;
  const identity = await loadIdentity(agentName, useKv);
  if (!identity) {
    console.error(`❌ Identity not found for chain listener: ${agentName}`);
    return;
  }
  while (listener.isRunning) {
    try {
      const blocks = await getAllBlocks();
      const latestBlock = blocks.sort((a, b) => b.ts - a.ts)[0];
      if (latestBlock && latestBlock.hash !== listener.lastProcessedBlock) {
        await processNewBlock(latestBlock, identity, agentName, useKv);
        listener.lastProcessedBlock = latestBlock.hash;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ Chain listener error for ${agentName}:`, error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}
async function processNewBlock(block: any, identity: any, agentName: string, useKv = false): Promise<void> {
  let intentData: any = null;
  try {
    intentData = block.intentData;
    if (!intentData) return;
    if (intentData.executor !== identity.did) return;
    console.log(`🎯 Agent ${agentName} received intent: ${intentData.action}`);
    const isValidSignature = await verifyBlockSignature(
      block.prev,
      block.intent,
      block.ts,
      block.sig,
      block.actor.pub
    );
    if (!isValidSignature) {
      console.error(`❌ Invalid signature for intent to ${agentName}`);
      await appendLog(agentName, {
        action: "chain_intent_rejected",
        actor: agentName,
        details: { intent: intentData.action, reason: "Invalid signature" }
      }, useKv);
      return;
    }
    const hasCapability = await verifyCapability(
      block.actor.did,
      identity.did,
      intentData.action
    );
    if (!hasCapability) {
      console.error(`❌ Agent ${agentName} lacks capability for: ${intentData.action}`);
      await appendLog(agentName, {
        action: "chain_intent_rejected",
        actor: agentName,
        details: { intent: intentData.action, reason: "No capability" }
      }, useKv);
      return;
    }
    console.log(`⚡ Agent ${agentName} executing chain intent: ${intentData.action}`);
    const result = await executeIntent(intentData.action, intentData.params || {}, useKv);
    await incrementReputation(agentName, useKv);
    const newRep = await getReputation(agentName, useKv);
    console.log(`✅ Agent ${agentName} executed chain intent successfully (+0.3 reputation, now ${newRep.toFixed(2)})`);
    await appendLog(agentName, {
      action: "chain_intent_executed",
      actor: agentName,
      details: { 
        intent: intentData.action,
        result,
        reputation: newRep,
        block_hash: block.hash
      }
    }, useKv);
  } catch (error) {
    console.error(`❌ Agent ${agentName} failed to execute chain intent:`, error);
    await appendLog(agentName, {
      action: "chain_intent_error",
      actor: agentName,
      details: { 
        intent: intentData?.action || "unknown",
        error: error.message,
        block_hash: block.hash
      }
    }, useKv);
  }
}