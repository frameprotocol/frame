import { get, set, list } from "./storage.ts";
import { appendLog } from "./utils.ts";
interface Peer {
  id: string;
  url: string;
  trustScore: number;
  lastSeen: number;
  lastPing?: number;
  pingLatency?: number;
  capabilities: string[];
  knownPeers: string[];
  isActive: boolean;
}
interface PeerTrust {
  from: string;
  to: string;
  score: number;
  reason: string;
  timestamp: number;
}
let peers = new Map<string, Peer>();
let peerTrust = new Map<string, PeerTrust>();
export async function addPeer(url: string, trustScore: number = 0.5, capabilities: string[] = []): Promise<void> {
  const peerId = extractPeerId(url);
  const peer: Peer = {
    id: peerId,
    url,
    trustScore,
    lastSeen: Date.now(),
    capabilities,
    knownPeers: [],
    isActive: true
  };
  await set(["peers", peerId], peer);
  peers.set(peerId, peer);
  console.log(`🌐 Added peer: ${peerId} (${url}) - Trust: ${trustScore}`);
  await appendLog("system", {
    action: "peer_added",
    actor: "system",
    details: { peer_id: peerId, url, trust_score: trustScore }
  });
}
export async function updatePeerTrust(peerId: string, score: number, reason: string = "manual"): Promise<void> {
  const peer = await getPeer(peerId);
  if (!peer) {
    throw new Error(`Peer not found: ${peerId}`);
  }
  peer.trustScore = Math.max(0, Math.min(1, score)); 
  peer.lastSeen = Date.now();
  await set(["peers", peerId], peer);
  peers.set(peerId, peer);
  const trustRecord: PeerTrust = {
    from: "system",
    to: peerId,
    score,
    reason,
    timestamp: Date.now()
  };
  await set(["peer_trust", `${peerId}-${Date.now()}`], trustRecord);
  console.log(`🤝 Updated trust for ${peerId}: ${score} (${reason})`);
  await appendLog("system", {
    action: "peer_trust_updated",
    actor: "system",
    details: { peer_id: peerId, score, reason }
  });
}
export async function getPeer(peerId: string): Promise<Peer | null> {
  if (peers.has(peerId)) {
    return peers.get(peerId)!;
  }
  const peer = await get(["peers", peerId]);
  if (peer) {
    peers.set(peerId, peer);
  }
  return peer;
}
export async function listPeers(): Promise<Peer[]> {
  const entries = await list(["peers"]);
  return entries.map(entry => entry.value as Peer);
}
export async function getTrustedPeers(threshold: number = 0.5): Promise<Peer[]> {
  const allPeers = await listPeers();
  return allPeers
    .filter(peer => peer.trustScore >= threshold && peer.isActive)
    .sort((a, b) => b.trustScore - a.trustScore);
}
export async function pingPeer(peerId: string): Promise<boolean> {
  const peer = await getPeer(peerId);
  if (!peer) {
    return false;
  }
  try {
    const startTime = Date.now();
    const response = await fetch(`${peer.url}/ping`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) 
    });
    if (response.ok) {
      const latency = Date.now() - startTime;
      peer.lastPing = Date.now();
      peer.pingLatency = latency;
      peer.lastSeen = Date.now();
      await set(["peers", peerId], peer);
      peers.set(peerId, peer);
      console.log(`🏓 Pinged ${peerId}: ${latency}ms`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Failed to ping ${peerId}:`, error);
  }
  return false;
}
export async function exchangePeers(peerId: string): Promise<void> {
  const peer = await getPeer(peerId);
  if (!peer) {
    return;
  }
  try {
    const ourPeers = await listPeers();
    const ourPeerInfo = ourPeers.map(p => ({
      id: p.id,
      url: p.url,
      trustScore: p.trustScore,
      lastSeen: p.lastSeen
    }));
    const response = await fetch(`${peer.url}/peers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peers: ourPeerInfo }),
      signal: AbortSignal.timeout(10000)
    });
    if (response.ok) {
      const remotePeers = await response.json();
      for (const remotePeer of remotePeers.peers || []) {
        await processRemotePeer(remotePeer, peerId);
      }
      console.log(`🔄 Exchanged peer info with ${peerId}`);
    }
  } catch (error) {
    console.error(`❌ Failed to exchange peers with ${peerId}:`, error);
  }
}
async function processRemotePeer(remotePeer: any, sourcePeerId: string): Promise<void> {
  const existingPeer = await getPeer(remotePeer.id);
  if (!existingPeer) {
    const newTrustScore = Math.min(0.3, remotePeer.trustScore * 0.8);
    await addPeer(remotePeer.url, newTrustScore);
  } else {
    const sourcePeer = await getPeer(sourcePeerId);
    if (sourcePeer && sourcePeer.trustScore > 0.7) {
      const newTrustScore = (existingPeer.trustScore + remotePeer.trustScore) / 2;
      await updatePeerTrust(remotePeer.id, newTrustScore, `peer_exchange_from_${sourcePeerId}`);
    }
  }
}
export async function validatePeer(peerId: string): Promise<boolean> {
  const peer = await getPeer(peerId);
  if (!peer) {
    return false;
  }
  const ageInDays = (Date.now() - peer.lastSeen) / (1000 * 60 * 60 * 24);
  if (ageInDays > 7) {
    peer.isActive = false;
    await set(["peers", peerId], peer);
    peers.set(peerId, peer);
    return false;
  }
  const isReachable = await pingPeer(peerId);
  if (!isReachable) {
    peer.trustScore = Math.max(0, peer.trustScore - 0.1);
    await set(["peers", peerId], peer);
    peers.set(peerId, peer);
  }
  return isReachable;
}
export async function getPeerTrustHistory(peerId: string): Promise<PeerTrust[]> {
  const entries = await list(["peer_trust"]);
  return entries
    .map(entry => entry.value as PeerTrust)
    .filter(trust => trust.to === peerId)
    .sort((a, b) => b.timestamp - a.timestamp);
}
export async function removePeer(peerId: string): Promise<void> {
  const peer = await getPeer(peerId);
  if (!peer) {
    return;
  }
  await set(["peers", peerId], null);
  peers.delete(peerId);
  console.log(`🗑️ Removed peer: ${peerId}`);
  await appendLog("system", {
    action: "peer_removed",
    actor: "system",
    details: { peer_id: peerId, url: peer.url }
  });
}
export function extractPeerId(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.hostname}:${urlObj.port || '80'}`;
  } catch {
    return url.replace(/[^a-zA-Z0-9.-]/g, '_');
  }
}
export async function getPeerStats(): Promise<{
  totalPeers: number;
  activePeers: number;
  averageTrustScore: number;
  topPeers: Peer[];
}> {
  const allPeers = await listPeers();
  const activePeers = allPeers.filter(p => p.isActive);
  const averageTrustScore = allPeers.reduce((sum, p) => sum + p.trustScore, 0) / allPeers.length;
  const topPeers = allPeers
    .filter(p => p.isActive)
    .sort((a, b) => b.trustScore - a.trustScore)
    .slice(0, 5);
  return {
    totalPeers: allPeers.length,
    activePeers: activePeers.length,
    averageTrustScore: averageTrustScore || 0,
    topPeers
  };
} 