import { createIdentity, forkIdentity, mergeIdentities } from "./core/identity.ts";
import { grantCapability, revokeCapability, purgeInvalidCapabilities } from "./core/capabilities.ts";
import { resolveIntent, parseIntentUrl, executeIntent } from "./core/intent.ts";
import { trustIdentity, claimHandle, whois } from "./core/trust.ts";
import { runAgent, submitIntent } from "./core/agent.ts";
import { sendMessage, getInbox, markRead, sendPing, sendCapabilityRequest, sendIntentSuggestion } from "./core/message.ts";
import { listPeers, addPeer, updatePeerTrust, getPeerStats, extractPeerId } from "./core/peers.ts";
import { getBalance, mintTokens, transferTokens, initializeTokenSystem } from "./core/token.ts";
import { createIntentProof, storeProof, getProof, getAllProofs, verifyStoredProof, type IntentData, createBlock, storeBlock, verifyChain, getAllBlocks, getLatestBlockHash } from "./core/proof.ts";
import { createReflexRule, getReflexRules, checkReflexRules, getReflexStats } from "./core/reflex.ts";
import { defineStakingConfig, stakeForCapability, unlockStake, getUserStakes, getStakingStats } from "./core/staking.ts";
const kvFlagIndex = Deno.args.indexOf('--kv');
const useKv = kvFlagIndex !== -1;
const filteredArgs = Deno.args.filter(arg => arg !== '--kv');
const [command, ...args] = filteredArgs;
if (!("openKv" in Deno)) {
  console.warn("⚠️  Deno KV not available. Please run with: --unstable");
}
const [major, minor] = Deno.version.deno.split(".").map(Number);
if (major < 1 || (major === 1 && minor < 32)) {
  console.warn(`⚠️  FRAME requires Deno v1.32+ — you are on ${Deno.version.deno}`);
}
switch (command) {
  case "create":
    const name = args[0];
    if (!name) {
      console.error("Usage: frame create <name>");
      Deno.exit(1);
    }
    await createIdentity(name, useKv);
    break;
  case "fork": {
    const [parent, child] = args;
    if (!parent || !child) {
      console.error("Usage: frame fork <parent> <child>");
      Deno.exit(1);
    }
    await forkIdentity(parent, child, useKv);
    break;
  }
  case "merge": {
    const [from, intoFlag, target] = args;
    if (!from || intoFlag !== "into" || !target) {
      console.error("Usage: frame merge <from> into <target>");
      Deno.exit(1);
    }
    await mergeIdentities(from, target, useKv);
    break;
  }
  case "resolve": {
    const intent = args[0];
    if (!intent) {
      console.error("Usage: frame resolve <intent>");
      Deno.exit(1);
    }
    await resolveIntent(intent, undefined, useKv);
    break;
  }
  case "intent": {
    const intentUrl = args[0];
    const shouldExecute = args[1] === "--exec";
    const shouldAnchor = args.includes("--anchor");
    if (!intentUrl) {
      console.error("Usage: frame intent 'intent://<action>?key=value' [--exec] [--anchor]");
      Deno.exit(1);
    }
    const { action, params } = parseIntentUrl(intentUrl);
    if (shouldExecute) {
      await executeIntent(action, params, useKv);
      try {
        console.log(`🔗 Creating hashchain block...`);
        const intentData: IntentData = {
          action,
          params,
          executor: "did:frame:alice",
          issuer: "did:frame:alice",
          timestamp: Date.now()
        };
        const { generateIntentProof, getActorInfo, signBlockPayload } = await import("./core/proof.ts");
        const intentHash = await generateIntentProof(intentData);
        const prevHash = await getLatestBlockHash();
        const actor = await getActorInfo("did:frame:alice");
        if (!actor) {
          console.error(`❌ Could not get actor info for did:frame:alice`);
          break;
        }
        const { get } = await import("./core/storage.ts");
        const identity = await get(["unit", "did:frame:alice"]);
        if (!identity || !identity.signPrivateKey) {
          console.error(`❌ Could not get private key for did:frame:alice`);
          break;
        }
        const signature = await signBlockPayload(
          prevHash,
          intentHash,
          Date.now(),
          identity.signPrivateKey
        );
        const block = await createBlock(intentHash, signature, actor, prevHash);
        await storeBlock(block);
        console.log(`✅ Block added to hashchain: ${block.hash.substring(0, 16)}...`);
        console.log(`🔐 Signed by: ${actor.did} (${actor.keytype})`);
        if (shouldAnchor) {
          console.log(`🔗 Creating intent proof...`);
          try {
            const proof = await createIntentProof(intentData, identity.signPrivateKey, identity.signPublicKey, true);
            await storeProof(proof);
            console.log(`✅ Intent proof created and anchored: ${proof.intentHash}`);
          } catch (error) {
            console.error(`❌ Failed to create intent proof: ${error}`);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to create hashchain block: ${error}`);
      }
    } else {
      await resolveIntent(action, params, useKv);
    }
    break;
  }
  case "grant": {
    const action = args[0];
    const toFlag = args[1];
    const recipient = args[2];
    let expires_at: string | null = null;
    if (args[3] === "--expires" && args[4]) {
      expires_at = args[4];
    }
    if (!action || toFlag !== "--to" || !recipient) {
      console.error("Usage: frame grant <action> --to <recipient> [--expires <ISODate>]");
      Deno.exit(1);
    }
    await grantCapability("alice", recipient, action, expires_at, useKv);
    break;
  }
  case "revoke": {
    const [action, fromFlag, from] = args;
    if (!action || fromFlag !== "--from" || !from) {
      console.error("Usage: frame revoke <action> --from <identity>");
      Deno.exit(1);
    }
    await revokeCapability("alice", from, action, useKv);
    break;
  }
  case "cap": {
    const subcommand = args[0];
    if (subcommand === "purge-invalid") {
      await purgeInvalidCapabilities(useKv);
    } else if (subcommand === "list") {
      const { list } = await import("./core/storage.ts");
      const caps = await list(["cap"]);
      console.log("📦 All Capabilities:");
      for (const entry of caps) {
        const status = entry.value.revoked ? "❌" : "✅";
        const expires = entry.value.expires_at ? ` (expires: ${entry.value.expires_at})` : "";
        console.log(`  ${status} ${entry.key.join(" → ")}${expires}`);
      }
    } else if (subcommand === "audit") {
      const { list } = await import("./core/storage.ts");
      const caps = await list(["cap"]);
      console.log("🔍 Capability Audit:");
      let total = 0;
      let valid = 0;
      let expired = 0;
      let revoked = 0;
      for (const entry of caps) {
        total++;
        if (entry.value.revoked) {
          revoked++;
        } else if (entry.value.expires_at && new Date(entry.value.expires_at) < new Date()) {
          expired++;
        } else {
          valid++;
        }
      }
      console.log(`  Total capabilities: ${total}`);
      console.log(`  Valid: ${valid}`);
      console.log(`  Expired: ${expired}`);
      console.log(`  Revoked: ${revoked}`);
      if (expired > 0 || revoked > 0) {
        console.log("\n  Expired/Revoked capabilities:");
        for (const entry of caps) {
          if (entry.value.revoked || (entry.value.expires_at && new Date(entry.value.expires_at) < new Date())) {
            const status = entry.value.revoked ? "❌ REVOKED" : "⏰ EXPIRED";
            console.log(`    ${status}: ${entry.key.join(" → ")}`);
          }
        }
      }
    } else {
      console.error("Usage: frame cap <purge-invalid|list|audit>");
      Deno.exit(1);
    }
    break;
  }
  case "trust": {
    const [from, flag, to] = args;
    if (!from || flag !== "--trusts" || !to) {
      console.error("Usage: frame trust <from> --trusts <to>");
      Deno.exit(1);
    }
    await trustIdentity(from, to, 1.0, useKv);
    break;
  }
  case "claim": {
    const [handle, asFlag, identity] = args;
    if (!handle || asFlag !== "--as" || !identity) {
      console.error("Usage: frame claim @<handle> --as <identity>");
      Deno.exit(1);
    }
    await claimHandle(identity, handle, useKv);
    break;
  }
  case "whois": {
    const handle = args[0];
    if (!handle) {
      console.error("Usage: frame whois @<handle>");
      Deno.exit(1);
    }
    await whois(handle, useKv);
    break;
  }
  case "balance": {
    const identity = args[0];
    if (!identity) {
      console.error("Usage: frame balance <identity> [--kv]");
      Deno.exit(1);
    }
    const balance = await getBalance(identity, useKv);
    console.log(`💰 ${identity} balance: ${balance} FRAME tokens`);
    break;
  }
  case "mint": {
    const [identity, amount] = args;
    if (!identity || !amount) {
      console.error("Usage: frame mint <identity> <amount> [--kv]");
      Deno.exit(1);
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      console.error("❌ Invalid amount. Must be a positive number.");
      Deno.exit(1);
    }
    const success = await mintTokens(identity, numAmount, "did:frame:alice", useKv);
    if (success) {
      console.log(`✅ Successfully minted ${numAmount} FRAME tokens for ${identity}`);
    } else {
      console.error(`❌ Failed to mint tokens for ${identity}`);
      Deno.exit(1);
    }
    break;
  }
  case "transfer": {
    const [from, to, amount] = args;
    if (!from || !to || !amount) {
      console.error("Usage: frame transfer <from> <to> <amount> [--kv]");
      Deno.exit(1);
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      console.error("❌ Invalid amount. Must be a positive number.");
      Deno.exit(1);
    }
    const success = await transferTokens(from, to, numAmount, useKv);
    if (success) {
      console.log(`✅ Successfully transferred ${numAmount} FRAME tokens from ${from} to ${to}`);
    } else {
      console.error(`❌ Failed to transfer tokens from ${from} to ${to}`);
      Deno.exit(1);
    }
    break;
  }
  case "chain": {
    const subcommand = args[0];
    if (subcommand === "verify") {
      console.log("🔍 Verifying hashchain integrity...");
      const result = await verifyChain();
      if (result.valid) {
        console.log("✅ Hashchain verification passed!");
      } else {
        console.log("❌ Hashchain verification failed:");
        for (const error of result.errors) {
          console.log(`  - ${error}`);
        }
        Deno.exit(1);
      }
    } else if (subcommand === "show") {
      const blocks = await getAllBlocks();
      if (blocks.length === 0) {
        console.log("🔗 No blocks in chain");
      } else {
        console.log("🔗 Hashchain blocks:");
        blocks.sort((a, b) => a.ts - b.ts);
        for (let i = 0; i < blocks.length; i++) {
          const block = blocks[i];
          console.log(`  Block ${i + 1}:`);
          console.log(`    Hash: ${block.hash.substring(0, 16)}...`);
          console.log(`    Prev: ${block.prev.substring(0, 16)}...`);
          console.log(`    Intent: ${block.intent.substring(0, 16)}...`);
          console.log(`    Actor: ${block.actor.did}`);
          console.log(`    Time: ${new Date(block.ts).toISOString()}`);
          console.log("");
        }
      }
    } else if (subcommand === "wipe") {
      console.log("🗑️  Wiping chain...");
      try {
        try {
          await Deno.remove('data/chain.jsonl');
          console.log("✅ Deleted chain.jsonl");
        } catch (error) {
          console.log("ℹ️  chain.jsonl not found (already deleted)");
        }
        const { getKv } = await import("./core/storage.ts");
        const kv = await getKv();
        const blocks = await kv.list({ prefix: ["blocks"] });
        for await (const block of blocks) {
          await kv.delete(block.key);
        }
        await kv.delete(["chain", "latest"]);
        console.log("✅ Chain wiped successfully");
      } catch (error) {
        console.error(`❌ Failed to wipe chain: ${error}`);
        Deno.exit(1);
      }
    } else {
      console.error("Usage: frame chain <verify|show|wipe>");
      Deno.exit(1);
    }
    break;
  }
  case "explorer": {
    const port = args[0] ? parseInt(args[0]) : 8080;
    if (isNaN(port) || port < 1 || port > 65535) {
      console.error("Usage: frame explorer [port]");
      console.error("Port must be between 1 and 65535");
      Deno.exit(1);
    }
    console.log(`🌐 Starting FRAME blockchain explorer on port ${port}...`);
    console.log(`📱 Open http://localhost:${port} in your browser`);
    const { startExplorer } = await import("./core/explorer.ts");
    await startExplorer(port);
    break;
  }
  case "proof": {
    const subcommand = args[0];
    if (subcommand === "list") {
      const proofs = await getAllProofs();
      if (proofs.length === 0) {
        console.log("📝 No proofs found");
      } else {
        console.log("📝 Stored Proofs:");
        for (const proof of proofs) {
          console.log(`  🔗 ${proof.intentHash.substring(0, 16)}...`);
          console.log(`     Action: ${proof.intentData.action}`);
          console.log(`     Timestamp: ${new Date(proof.timestamp).toISOString()}`);
          if (proof.txHash) {
            console.log(`     TX: ${proof.txHash.substring(0, 16)}...`);
          }
          console.log("");
        }
      }
    } else if (subcommand === "verify") {
      const intentHash = args[1];
      if (!intentHash) {
        console.error("Usage: frame proof verify <intent_hash> [--kv]");
        Deno.exit(1);
      }
      const isValid = await verifyStoredProof(intentHash);
      if (isValid) {
        console.log(`✅ Proof verified successfully`);
      } else {
        console.log(`❌ Proof verification failed`);
        Deno.exit(1);
      }
    } else if (subcommand === "show") {
      const intentHash = args[1];
      if (!intentHash) {
        console.error("Usage: frame proof show <intent_hash> [--kv]");
        Deno.exit(1);
      }
      const proof = await getProof(intentHash);
      if (proof) {
        console.log("📝 Proof Details:");
        console.log(`  Intent Hash: ${proof.intentHash}`);
        console.log(`  Signature: ${proof.signature.substring(0, 32)}...`);
        console.log(`  Public Key: ${proof.publicKey.substring(0, 32)}...`);
        console.log(`  Timestamp: ${new Date(proof.timestamp).toISOString()}`);
        console.log(`  Action: ${proof.intentData.action}`);
        console.log(`  Params: ${JSON.stringify(proof.intentData.params)}`);
        if (proof.txHash) {
          console.log(`  Transaction: ${proof.txHash}`);
        }
        if (proof.blockHash) {
          console.log(`  Block: ${proof.blockHash}`);
        }
      } else {
        console.error(`❌ Proof not found: ${intentHash}`);
        Deno.exit(1);
      }
    } else {
      console.error("Usage: frame proof <list|verify|show> [intent_hash] [--kv]");
      Deno.exit(1);
    }
    break;
  }
  case "log": {
    const name = args[0];
    if (!name) {
      console.error("Usage: frame log <identity>");
      Deno.exit(1);
    }
    if (useKv) {
      const storage = await import("./core/storage.ts");
      const log = await storage.get(["log", name]);
      if (log && Array.isArray(log)) {
        console.log(`📜 Log for ${name}:\n` + log.map(entry => JSON.stringify(entry)).join("\n"));
      } else {
        console.error(`❌ No log found for ${name}`);
      }
    } else {
      const path = `data/logs/${name}.log`;
      try {
        const log = await Deno.readTextFile(path);
        console.log(`📜 Log for ${name}:\n${log}`);
      } catch {
        console.error(`❌ No log found for ${name}`);
      }
    }
    break;
  }
  case "list": {
    const prefix = args[0];
    if (!prefix) {
      console.error("Usage: frame list <prefix> [--kv]");
      console.error("Prefixes: unit, cap, trust, log, handle, pending_intents, processed_intents, reputation, inbox, outbox, balance, transfers, proofs, all");
      Deno.exit(1);
    }
    if (useKv) {
      const storage = await import("./core/storage.ts");
      if (prefix === "all") {
        const allPrefixes = ["unit", "cap", "trust", "log", "handle", "pending_intents", "processed_intents", "reputation", "inbox", "outbox", "balance", "transfers", "proofs"];
        for (const p of allPrefixes) {
          console.log(`\n🔹 ${p.toUpperCase()}`);
          const entries = await storage.list([p]);
          if (entries.length === 0) {
            console.log(`  (empty)`);
          } else {
            for (const entry of entries) {
              console.log(`  ${JSON.stringify(entry.key)} → ${JSON.stringify(entry.value)}`);
            }
          }
        }
      } else {
        console.log(`🔍 Listing ${prefix} entries:`);
        const entries = await storage.list([prefix]);
        if (entries.length === 0) {
          console.log(`  (empty)`);
        } else {
          for (const entry of entries) {
            console.log(`🧱 ${JSON.stringify(entry.key)} → ${JSON.stringify(entry.value)}`);
          }
        }
      }
    } else {
      console.error("❌ List command only works with --kv flag");
      Deno.exit(1);
    }
    break;
  }
  case "agent": {
    const name = args[0];
    if (!name) {
      console.error("Usage: frame agent <identity> [--kv] [--peers <url1,url2>] [--serve] [--port <port>]");
      Deno.exit(1);
    }
    if (!useKv) {
      console.error("❌ Agent command only works with --kv flag");
      Deno.exit(1);
    }
    const peersIndex = args.indexOf('--peers');
    const serveIndex = args.indexOf('--serve');
    const portIndex = args.indexOf('--port');
    let peers: string[] = [];
    let serve = false;
    let port = 7001;
    if (peersIndex !== -1 && args[peersIndex + 1]) {
      peers = args[peersIndex + 1].split(',');
    }
    if (serveIndex !== -1) {
      serve = true;
    }
    if (portIndex !== -1 && args[portIndex + 1]) {
      port = parseInt(args[portIndex + 1]);
    }
    await runAgent(name, useKv, { peers, serve, port });
    break;
  }
  case "submit": {
    const intentUrl = args[0];
    if (!intentUrl) {
      console.error("Usage: frame submit 'intent://<action>?params' [--kv]");
      Deno.exit(1);
    }
    if (!useKv) {
      console.error("❌ Submit command only works with --kv flag");
      Deno.exit(1);
    }
    const intentId = await submitIntent(intentUrl, useKv);
    console.log(`📤 Intent submitted with ID: ${intentId}`);
    break;
  }
  case "message": {
    const subcommand = args[0];
    if (subcommand === "send") {
      const fromIndex = args.indexOf('--from');
      const toIndex = args.indexOf('--to');
      const typeIndex = args.indexOf('--type');
      const payloadIndex = args.indexOf('--payload');
      const encryptIndex = args.indexOf('--encrypt');
      if (fromIndex === -1 || toIndex === -1 || typeIndex === -1 || payloadIndex === -1) {
        console.error("Usage: frame message send --from <identity> --to <identity> --type <type> --payload <json> [--encrypt] [--kv]");
        Deno.exit(1);
      }
      const from = args[fromIndex + 1];
      const to = args[toIndex + 1];
      const type = args[typeIndex + 1];
      const payload = JSON.parse(args[payloadIndex + 1]);
      const encrypt = encryptIndex !== -1;
      if (!useKv) {
        console.error("❌ Message command only works with --kv flag");
        Deno.exit(1);
      }
      const messageId = await sendMessage(from, to, type, payload, useKv, encrypt);
      console.log(`📤 Message sent with ID: ${messageId}${encrypt ? ' (encrypted)' : ''}`);
    } else if (subcommand === "ping") {
      const from = args[1];
      const to = args[2];
      if (!from || !to) {
        console.error("Usage: frame message ping <from> <to> [--kv]");
        Deno.exit(1);
      }
      if (!useKv) {
        console.error("❌ Message command only works with --kv flag");
        Deno.exit(1);
      }
      const messageId = await sendPing(from, to, useKv);
      console.log(`🏓 Ping sent with ID: ${messageId}`);
    } else {
      console.error("Usage: frame message <send|ping> ...");
      Deno.exit(1);
    }
    break;
  }
  case "inbox": {
    const subcommand = args[0];
    const identity = args[1];
    if (!identity) {
      console.error("Usage: frame inbox <show|mark-read> <identity> [message_id] [--kv]");
      Deno.exit(1);
    }
    if (!useKv) {
      console.error("❌ Inbox command only works with --kv flag");
      Deno.exit(1);
    }
    if (subcommand === "show" || !subcommand) {
      const inbox = await getInbox(identity, useKv);
      if (inbox.length === 0) {
        console.log(`📭 No messages in ${identity}'s inbox`);
      } else {
        console.log(`📬 Inbox for ${identity}:`);
        for (let i = 0; i < inbox.length; i++) {
          const msg = inbox[i];
          const status = msg.read ? "📖" : "📨";
          const encryptIcon = msg.encrypted ? "🔐" : "";
          console.log(`  ${i + 1}. ${status} ${encryptIcon} ${msg.from} → ${msg.type} (${msg.sent_at})`);
          if (msg.encrypted) {
            try {
              const { decryptMessagePayload } = await import("./core/message.ts");
              const decryptedPayload = await decryptMessagePayload(msg, identity, useKv);
              console.log(`     🔓 Decrypted: ${JSON.stringify(decryptedPayload)}`);
            } catch (error) {
              console.log(`     🔐 Encrypted (failed to decrypt: ${error})`);
            }
          } else {
            console.log(`     Payload: ${JSON.stringify(msg.payload)}`);
          }
        }
      }
    } else if (subcommand === "mark-read") {
      const messageId = args[2];
      if (!messageId) {
        console.error("Usage: frame inbox mark-read <identity> <message_id> [--kv]");
        Deno.exit(1);
      }
      const success = await markRead(identity, messageId, useKv);
      if (success) {
        console.log(`✅ Message marked as read`);
      } else {
        console.log(`❌ Message not found`);
      }
    } else {
      console.error("Usage: frame inbox <show|mark-read> <identity> [message_id] [--kv]");
      Deno.exit(1);
    }
    break;
  }
  case "peers": {
    const sub = args[0];
    if (sub === "list") {
      const peers = await listPeers();
      console.log("📡 Known Peers:");
      for (const peer of peers) {
        const status = peer.isActive ? "🟢" : "🔴";
        console.log(`• ${status} ${peer.id} (${peer.url}) - Trust: ${peer.trustScore.toFixed(2)}`);
      }
    } else if (sub === "add") {
      const url = args[1];
      const trustScore = args[2] ? parseFloat(args[2]) : 0.5;
      await addPeer(url, trustScore);
      console.log(`✅ Added peer: ${url} with trust score ${trustScore}`);
    } else {
      console.error("Usage: frame peers <list|add> [url] [trustScore]");
      Deno.exit(1);
    }
    break;
  }
  case "reflex": {
    const subcommand = args[0];
    if (!useKv) {
      console.error("❌ Reflex command only works with --kv flag");
      Deno.exit(1);
    }
    if (subcommand === "add") {
      const [agent, condition, action] = args.slice(1);
      if (!agent || !condition || !action) {
        console.error("Usage: frame reflex add <agent> <condition> <action> [--kv]");
        console.error("Example: frame reflex add alice 'balance < 50' 'mint.self?amount=100'");
        Deno.exit(1);
      }
      const ruleId = await createReflexRule(agent, condition, action, useKv);
      console.log(`🧠 Created reflex rule: ${ruleId}`);
    } else if (subcommand === "list") {
      const agent = args[1];
      if (!agent) {
        console.error("Usage: frame reflex list <agent> [--kv]");
        Deno.exit(1);
      }
      const rules = await getReflexRules(agent, useKv);
      console.log(`🧠 Reflex rules for ${agent}:`);
      for (const rule of rules) {
        console.log(`  ${rule.id}: ${rule.condition} → ${rule.action} (${rule.triggerCount} triggers)`);
      }
    } else if (subcommand === "stats") {
      const agent = args[1];
      if (!agent) {
        console.error("Usage: frame reflex stats <agent> [--kv]");
        Deno.exit(1);
      }
      const stats = await getReflexStats(agent, useKv);
      console.log(`🧠 Reflex stats for ${agent}:`);
      console.log(`  Total rules: ${stats.totalRules}`);
      console.log(`  Enabled rules: ${stats.enabledRules}`);
      console.log(`  Total triggers: ${stats.totalTriggers}`);
    } else if (subcommand === "check") {
      const agent = args[1];
      if (!agent) {
        console.error("Usage: frame reflex check <agent> [--kv]");
        Deno.exit(1);
      }
      await checkReflexRules(agent, useKv);
      console.log(`🧠 Checked reflex rules for ${agent}`);
    } else {
      console.error("Usage: frame reflex <add|list|stats|check> ...");
      Deno.exit(1);
    }
    break;
  }
  case "trust-peer": {
    const [peerArg, score] = args;
    if (!peerArg || !score) {
      console.error("Usage: frame trust-peer <peer> <score> [--kv]");
      console.error("Example: frame trust-peer peer1.example.com:8080 0.8");
      Deno.exit(1);
    }
    if (!useKv) {
      console.error("❌ Trust-peer command only works with --kv flag");
      Deno.exit(1);
    }
    const numericScore = parseFloat(score);
    if (isNaN(numericScore) || numericScore < 0 || numericScore > 1) {
      console.error("❌ Trust score must be between 0 and 1");
      Deno.exit(1);
    }
    const peerId = extractPeerId(peerArg);
    await updatePeerTrust(peerId, numericScore, "manual");
    console.log(`🤝 Updated trust for ${peerId}: ${numericScore}`);
    break;
  }
  case "peer-stats": {
    if (!useKv) {
      console.error("❌ Peer stats command only works with --kv flag");
      Deno.exit(1);
    }
    const stats = await getPeerStats();
    console.log("🌐 Peer Statistics:");
    console.log(`  Total peers: ${stats.totalPeers}`);
    console.log(`  Active peers: ${stats.activePeers}`);
    console.log(`  Average trust score: ${stats.averageTrustScore.toFixed(2)}`);
    console.log("  Top trusted peers:");
    for (const peer of stats.topPeers) {
      console.log(`    ${peer.id}: ${peer.trustScore.toFixed(2)} (${peer.url})`);
    }
    break;
  }
  case "stake": {
    const subcommand = args[0];
    if (!useKv) {
      console.error("❌ Stake command only works with --kv flag");
      Deno.exit(1);
    }
    if (subcommand === "define") {
      const [capability, amount, lockPeriod, description] = args.slice(1);
      if (!capability || !amount || !lockPeriod || !description) {
        console.error("Usage: frame stake define <capability> <amount> <lockPeriodMs> <description> [--kv]");
        console.error("Example: frame stake define mint.frame 100 86400000 'Minting capability'");
        Deno.exit(1);
      }
      await defineStakingConfig(capability, parseFloat(amount), parseInt(lockPeriod), description);
      console.log(`🔒 Defined staking for ${capability}`);
    } else if (subcommand === "grant") {
      const [issuer, grantee, capability] = args.slice(1);
      if (!issuer || !grantee || !capability) {
        console.error("Usage: frame stake grant <issuer> <grantee> <capability> [--kv]");
        console.error("Example: frame stake grant alice bob mint.frame");
        Deno.exit(1);
      }
      if (!isNaN(parseFloat(capability))) {
        console.error("❌ Error: The third argument should be the capability name, not a number");
        console.error("Usage: frame stake grant <issuer> <grantee> <capability> [--kv]");
        console.error("Example: frame stake grant alice bob mint.frame");
        Deno.exit(1);
      }
      const stakeId = await stakeForCapability(issuer, grantee, capability, useKv);
      console.log(`🔒 Staked capability granted: ${stakeId}`);
    } else if (subcommand === "unlock") {
      const stakeId = args[1];
      if (!stakeId) {
        console.error("Usage: frame stake unlock <stakeId> [--kv]");
        Deno.exit(1);
      }
      await unlockStake(stakeId, useKv);
      console.log(`🔓 Unlocked stake: ${stakeId}`);
    } else if (subcommand === "list") {
      const user = args[1];
      if (!user) {
        console.error("Usage: frame stake list <user> [--kv]");
        Deno.exit(1);
      }
      const stakes = await getUserStakes(user, useKv);
      console.log(`🔒 Stakes for ${user}:`);
      for (const stake of stakes) {
        const status = stake.isActive ? "🔒" : "🔓";
        console.log(`  ${status} ${stake.id}: ${stake.capability} (${stake.stakeAmount} tokens)`);
      }
    } else if (subcommand === "stats") {
      const stats = await getStakingStats(useKv);
      console.log("🔒 Staking Statistics:");
      console.log(`  Total stakes: ${stats.totalStakes}`);
      console.log(`  Active stakes: ${stats.activeStakes}`);
      console.log(`  Average stake amount: ${stats.averageStakeAmount.toFixed(2)} tokens`);
    } else {
      console.error("Usage: frame stake <define|grant|unlock|list|stats>");
      Deno.exit(1);
    }
    break;
  }
  case "cap": {
    const subcommand = args[0];
    if (subcommand === "purge-invalid") {
      await purgeInvalidCapabilities(useKv);
    } else if (subcommand === "list") {
      const { list } = await import("./core/storage.ts");
      const caps = await list(["cap"]);
      console.log("📦 All Capabilities:");
      for (const entry of caps) {
        const status = entry.value.revoked ? "❌" : "✅";
        const expires = entry.value.expires_at ? ` (expires: ${entry.value.expires_at})` : "";
        console.log(`  ${status} ${entry.key.join(" → ")}${expires}`);
      }
    } else if (subcommand === "audit") {
      const { list } = await import("./core/storage.ts");
      const caps = await list(["cap"]);
      console.log("🔍 Capability Audit:");
      let total = 0;
      let valid = 0;
      let expired = 0;
      let revoked = 0;
      for (const entry of caps) {
        total++;
        if (entry.value.revoked) {
          revoked++;
        } else if (entry.value.expires_at && new Date(entry.value.expires_at) < new Date()) {
          expired++;
        } else {
          valid++;
        }
      }
      console.log(`  Total capabilities: ${total}`);
      console.log(`  Valid: ${valid}`);
      console.log(`  Expired: ${expired}`);
      console.log(`  Revoked: ${revoked}`);
      if (expired > 0 || revoked > 0) {
        console.log("\n  Expired/Revoked capabilities:");
        for (const entry of caps) {
          if (entry.value.revoked || (entry.value.expires_at && new Date(entry.value.expires_at) < new Date())) {
            const status = entry.value.revoked ? "❌ REVOKED" : "⏰ EXPIRED";
            console.log(`    ${status}: ${entry.key.join(" → ")}`);
          }
        }
      }
    } else {
      console.error("Usage: frame cap <purge-invalid|list|audit>");
      Deno.exit(1);
    }
    break;
  }
  case "repair-identities": {
    console.log("🔄 Repairing identity data...");
    const { repairIdentities } = await import("./core/identity.ts");
    await repairIdentities(useKv);
    console.log("✅ Identity data repair completed");
    break;
  }
  case "repair-caps": {
    console.log("🔄 Repairing capability data...");
    const { repairCapabilities } = await import("./core/capabilities.ts");
    await repairCapabilities(useKv);
    console.log("✅ Capability data repair completed");
    break;
  }
  default:
    console.error(`Unknown command: ${command}`);
    console.log("\nAvailable commands:");
    console.log("  frame create <name>                    - Create identity");
    console.log("  frame intent <url> [--exec] [--anchor] - Resolve/execute intent");
    console.log("  frame grant <action> --to <recipient>  - Grant capability");
    console.log("  frame trust <from> --trusts <to>       - Set trust relationship");
    console.log("  frame balance <identity>               - Check token balance");
    console.log("  frame mint <identity> <amount>         - Mint tokens");
    console.log("  frame transfer <from> <to> <amount>    - Transfer tokens");
    console.log("  frame chain <verify|show|wipe>         - Chain operations");
    console.log("  frame explorer [port]                  - Start web explorer");
    console.log("  frame agent <identity> [options]       - Run autonomous agent");
    console.log("  frame reflex <add|list|stats|check>    - Reflex rules");
    console.log("  frame trust-peer <peer> <score>        - Update peer trust");
    console.log("  frame peer-stats                       - Show peer statistics");
    console.log("  frame peers <list|add>                 - List/add peers");
    console.log("  frame stake <define|grant|unlock>      - Capability staking");
    console.log("  frame cap <list|audit|purge-invalid>   - Capability management");
    console.log("  frame repair-identities                - Repair identity data");
    console.log("  frame repair-caps                      - Repair capability data");
    console.log("\nAdd --kv flag to use Deno KV storage");
    Deno.exit(1);
}