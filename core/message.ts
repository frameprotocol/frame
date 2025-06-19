import * as storage from "./storage.ts";
import { loadIdentity } from "./identity.ts";
import { encryptMessage, decryptMessage, sign, verify } from "./crypto.ts";
import { appendLog } from "./storage.ts";
import { ensureDir, writeJson } from "./utils.ts";
export interface Message {
  id: string;
  from: string;
  to: string;
  type: string;
  payload: any;
  sent_at: string;
  read: boolean;
  encrypted?: boolean;
  ciphertext?: string;
  nonce?: string;
}
function extractNameFromDid(didOrName: string): string {
  if (didOrName.startsWith('did:frame:')) {
    return didOrName.replace('did:frame:', '');
  }
  return didOrName;
}
export async function sendMessage(from: string, to: string, type: string, payload: any, useKv = false, encrypt = false): Promise<string> {
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  let finalPayload = payload;
  let isEncrypted = false;
  let ciphertext: string | undefined;
  let nonce: string | undefined;
  if (encrypt && useKv) {
    try {
      const senderIdentity = await loadIdentity(extractNameFromDid(from), useKv);
      const recipientIdentity = await loadIdentity(extractNameFromDid(to), useKv);
      if (senderIdentity && recipientIdentity) {
        console.log("Encrypting for", to);
        console.log("Using P-256 ECDH + AES-GCM");
        const payloadString = JSON.stringify(payload);
        const encrypted = await encryptMessage(
          payloadString, 
          senderIdentity.encryption.privateKey, 
          recipientIdentity.encryption.publicKey
        );
        finalPayload = { encrypted: true };
        ciphertext = encrypted.ciphertext;
        nonce = encrypted.nonce;
        isEncrypted = true;
      }
    } catch (error) {
      console.warn(`Failed to encrypt message: ${error}`);
    }
  }
  const message: Message = {
    id: messageId,
    from: from.startsWith('did:frame:') ? from : `did:frame:${from}`,
    to: to.startsWith('did:frame:') ? to : `did:frame:${to}`,
    type,
    payload: finalPayload,
    sent_at: new Date().toISOString(),
    read: false,
    encrypted: isEncrypted,
    ciphertext,
    nonce
  };
  if (useKv) {
    const inbox = await getInbox(to, useKv);
    inbox.push(message);
    await storage.set(["inbox", to], inbox);
    const outbox = await getOutbox(from, useKv);
    outbox.push(message);
    await storage.set(["outbox", from], outbox);
  } else {
    console.log(`📤 Message sent: ${from} → ${to} (${type})`);
  }
  return messageId;
}
export async function getInbox(did: string, useKv = false): Promise<Message[]> {
  if (useKv) {
    return await storage.get(["inbox", did]) || [];
  } else {
    return [];
  }
}
export async function getOutbox(did: string, useKv = false): Promise<Message[]> {
  if (useKv) {
    return await storage.get(["outbox", did]) || [];
  } else {
    return [];
  }
}
export async function decryptMessagePayload(message: Message, recipientName: string, useKv = false): Promise<any> {
  if (!message.encrypted || !message.ciphertext || !message.nonce) {
    return message.payload;
  }
  try {
    const recipientIdentity = await loadIdentity(extractNameFromDid(recipientName), useKv);
    const senderIdentity = await loadIdentity(extractNameFromDid(message.from), useKv);
    if (recipientIdentity && senderIdentity) {
      const decryptedString = await decryptMessage(
        message.ciphertext, 
        message.nonce, 
        recipientIdentity.encryption.privateKey, 
        senderIdentity.encryption.publicKey
      );
      return JSON.parse(decryptedString);
    }
  } catch (error) {
    console.warn(`Failed to decrypt message: ${error}`);
  }
  return { error: "Failed to decrypt" };
}
export async function markRead(did: string, messageId: string, useKv = false): Promise<boolean> {
  if (useKv) {
    const inbox = await getInbox(did, useKv);
    const messageIndex = inbox.findIndex(msg => msg.id === messageId);
    if (messageIndex >= 0) {
      inbox[messageIndex].read = true;
      await storage.set(["inbox", did], inbox);
      return true;
    }
    return false;
  } else {
    return false;
  }
}
export async function getUnreadCount(did: string, useKv = false): Promise<number> {
  const inbox = await getInbox(did, useKv);
  return inbox.filter(msg => !msg.read).length;
}
export async function deleteMessage(did: string, messageId: string, useKv = false): Promise<boolean> {
  if (useKv) {
    const inbox = await getInbox(did, useKv);
    const filtered = inbox.filter(msg => msg.id !== messageId);
    if (filtered.length < inbox.length) {
      await storage.set(["inbox", did], filtered);
      return true;
    }
    return false;
  } else {
    return false;
  }
}
export async function sendPing(from: string, to: string, useKv = false): Promise<string> {
  return await sendMessage(from, to, 'ping', { 
    timestamp: new Date().toISOString(),
    agent: from 
  }, useKv);
}
export async function sendCapabilityRequest(from: string, to: string, action: string, useKv = false): Promise<string> {
  return await sendMessage(from, to, 'request_capability', {
    action,
    requested_at: new Date().toISOString(),
    requester: from
  }, useKv);
}
export async function sendIntentSuggestion(from: string, to: string, intentUrl: string, useKv = false): Promise<string> {
  return await sendMessage(from, to, 'suggest_intent', {
    intent_url: intentUrl,
    suggested_at: new Date().toISOString(),
    suggester: from
  }, useKv);
}
export async function sendTrustUpdate(from: string, to: string, trustScore: number, useKv = false): Promise<string> {
  return await sendMessage(from, to, 'trust_update', {
    trust_score: trustScore,
    updated_at: new Date().toISOString(),
    updater: from
  }, useKv);
}
export async function handleMessage(message: Message, agentName: string, useKv = false): Promise<void> {
  switch (message.type) {
    case 'ping':
      await sendMessage(agentName, message.from, 'pong', {
        timestamp: new Date().toISOString(),
        agent: agentName,
        original_ping: message.payload
      }, useKv);
      break;
    case 'request_capability':
      console.log(`📋 Capability request from ${message.from}: ${message.payload.action}`);
      break;
    case 'suggest_intent':
      console.log(`💡 Intent suggestion from ${message.from}: ${message.payload.intent_url}`);
      break;
    case 'trust_update':
      console.log(`🤝 Trust update from ${message.from}: ${message.payload.trust_score}`);
      break;
    default:
      console.log(`📨 Unknown message type from ${message.from}: ${message.type}`);
  }
} 