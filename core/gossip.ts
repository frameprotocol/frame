import { listPeers, addPeer } from "./peers.ts";
import { getLastNBlocks, storeBlock, getAllBlocks } from "./proof.ts";
const GOSSIP_INTERVAL = 30000; 
const CHAIN_SYNC_INTERVAL = 60000; 
let gossipRunning = false;
let chainSyncRunning = false;
let peerStatus: Record<string, { lastSeen: number; status: string }> = {};
export interface GossipMessage {
  type: 'ping' | 'pong' | 'chain_sync' | 'new_block';
  from: string;
  timestamp: number;
  data?: any;
}
export interface ChainSyncMessage {
  blocks: any[];
  latest_hash: string;
  peer_id: string;
}
export async function startGossip(peerId: string, port: number = 7001): Promise<void> {
  if (gossipRunning) {
    console.log("🔄 Gossip already running");
    return;
  }
  console.log(`🔄 Starting gossip protocol on port ${port}`);
  gossipRunning = true;
  const server = Deno.serve({ port }, async (req) => {
    const url = new URL(req.url);
    if (url.pathname === "/gossip/ping") {
      return new Response(JSON.stringify({
        type: "pong",
        from: peerId,
        timestamp: Date.now()
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    if (url.pathname === "/gossip/chain") {
      try {
        const blocks = await getLastNBlocks(10);
        const latestHash = blocks.length > 0 ? blocks[0].hash : "0000000000000000000000000000000000000000000000000000000000000000";
        return new Response(JSON.stringify({
          blocks,
          latest_hash: latestHash,
          peer_id: peerId
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Failed to get chain" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    if (url.pathname === "/gossip/new_block" && req.method === "POST") {
      try {
        const block = await req.json();
        await storeBlock(block);
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Failed to store block" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    return new Response("Not found", { status: 404 });
  });
  gossipLoop(peerId);
  chainSyncLoop(peerId);
  console.log(`✅ Gossip server started on port ${port}`);
}
export function stopGossip(): void {
  gossipRunning = false;
  chainSyncRunning = false;
  console.log("🛑 Gossip stopped");
}
async function gossipLoop(peerId: string): Promise<void> {
  while (gossipRunning) {
    try {
      const peers = await listPeers();
      for (const peer of peers) {
        try {
          const response = await fetch(`${peer.url}/gossip/ping`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
          });
          if (response.ok) {
            const pong = await response.json();
            console.log(`🏓 Pong from ${pong.from} (${peer.url})`);
          }
        } catch (error) {
          console.log(`❌ Failed to ping ${peer.url}: ${error}`);
        }
      }
    } catch (error) {
      console.error(`❌ Gossip loop error: ${error}`);
    }
    await new Promise(resolve => setTimeout(resolve, GOSSIP_INTERVAL));
  }
}
async function chainSyncLoop(peerId: string): Promise<void> {
  chainSyncRunning = true;
  while (chainSyncRunning) {
    try {
      const peers = await listPeers();
      const myBlocks = await getAllBlocks();
      const myLatestHash = myBlocks.length > 0 ? myBlocks[myBlocks.length - 1].hash : "0000000000000000000000000000000000000000000000000000000000000000";
      for (const peer of peers) {
        try {
          const response = await fetch(`${peer.url}/gossip/chain`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
          });
          if (response.ok) {
            const chainData: ChainSyncMessage = await response.json();
            if (chainData.latest_hash !== myLatestHash) {
              console.log(`🔄 Syncing chain from ${peer.url}`);
              for (const block of chainData.blocks) {
                const existingBlocks = await getAllBlocks();
                const hasBlock = existingBlocks.some(b => b.hash === block.hash);
                if (!hasBlock) {
                  try {
                    await storeBlock(block);
                    console.log(`✅ Synced block: ${block.hash.substring(0, 16)}...`);
                  } catch (error) {
                    console.log(`❌ Failed to sync block: ${error}`);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.log(`❌ Failed to sync with ${peer.url}: ${error}`);
        }
      }
    } catch (error) {
      console.error(`❌ Chain sync loop error: ${error}`);
    }
    await new Promise(resolve => setTimeout(resolve, CHAIN_SYNC_INTERVAL));
  }
}
export async function broadcastBlock(block: any): Promise<void> {
  try {
    const peers = await listPeers();
    for (const peer of peers) {
      try {
        const response = await fetch(`${peer.url}/gossip/new_block`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(block)
        });
        if (response.ok) {
          console.log(`📡 Broadcasted block to ${peer.url}`);
        }
      } catch (error) {
        console.log(`❌ Failed to broadcast to ${peer.url}: ${error}`);
      }
    }
  } catch (error) {
    console.error(`❌ Broadcast error: ${error}`);
  }
}
export async function getPeerChain(peerUrl: string): Promise<ChainSyncMessage | null> {
  try {
    const response = await fetch(`${peerUrl}/gossip/chain`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.log(`❌ Failed to get chain from ${peerUrl}: ${error}`);
  }
  return null;
}
if (import.meta.main) {
  const args = Deno.args;
  if (args[0] === "gossip" && args[1] === "status") {
    for (const [peer, status] of Object.entries(peerStatus)) {
      console.log(`${peer}: ${status.status} (last seen: ${new Date(status.lastSeen).toISOString()})`);
    }
    Deno.exit(0);
  }
} 