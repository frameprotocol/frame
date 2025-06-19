import { getAllBlocks, getLatestBlockHash, verifyChain } from "./proof.ts";
import { getAllProofs } from "./proof.ts";
import { getAllBalances } from "./token.ts";
const wsConnections = new Set<WebSocket>();
function broadcastUpdate(type: string, data: any): void {
  const message = JSON.stringify({ type, data, timestamp: Date.now() });
  wsConnections.forEach(ws => {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
    }
  });
}
function cleanupConnections(): void {
  wsConnections.forEach(ws => {
    if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
      wsConnections.delete(ws);
    }
  });
}
export async function startExplorer(port: number = 8080): Promise<void> {
  console.log(`🌐 Starting blockchain explorer on port ${port}`);
  const server = Deno.serve({ port }, async (req) => {
    const url = new URL(req.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (url.pathname === "/ws") {
      const upgrade = req.headers.get("upgrade") || "";
      if (upgrade.toLowerCase() != "websocket") {
        return new Response("Expected websocket", { status: 400 });
      }
      const { socket, response } = Deno.upgradeWebSocket(req);
      wsConnections.add(socket);
      console.log(`🔌 WebSocket connected. Total connections: ${wsConnections.size}`);
      socket.onopen = () => {
        console.log("WebSocket connection opened");
        socket.send(JSON.stringify({ 
          type: "connected", 
          message: "Connected to FRAME blockchain explorer",
          timestamp: Date.now()
        }));
      };
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("WebSocket message received:", message);
          switch (message.type) {
            case "ping":
              socket.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
              break;
            case "request_update":
              broadcastBlockchainUpdate();
              break;
            default:
              console.log("Unknown WebSocket message type:", message.type);
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };
      socket.onclose = () => {
        wsConnections.delete(socket);
        console.log(`🔌 WebSocket disconnected. Total connections: ${wsConnections.size}`);
      };
      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        wsConnections.delete(socket);
      };
      return response;
    }
    try {
      if (url.pathname === "/") {
        return new Response(createExplorerHTML(), {
          headers: { ...corsHeaders, "Content-Type": "text/html" }
        });
      }
      if (url.pathname === "/api/blocks") {
        const blocks = await getAllBlocks();
        blocks.sort((a, b) => b.ts - a.ts); 
        return new Response(JSON.stringify({
          blocks,
          total: blocks.length,
          latest_hash: await getLatestBlockHash()
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (url.pathname === "/api/chain.jsonl") {
        const blocks = await getAllBlocks();
        blocks.sort((a, b) => a.ts - b.ts); 
        const chainData = blocks.map(block => JSON.stringify(block)).join('\n');
        return new Response(chainData, {
          headers: { ...corsHeaders, "Content-Type": "application/jsonl" }
        });
      }
      if (url.pathname === "/api/proofs") {
        const proofs = await getAllProofs();
        return new Response(JSON.stringify({
          proofs,
          total: proofs.length
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (url.pathname === "/api/balances") {
        const balances = await getAllBalances();
        return new Response(JSON.stringify({
          balances,
          total: balances.length
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (url.pathname === "/api/verify") {
        const result = await verifyChain();
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (url.pathname === "/api/stats") {
        const blocks = await getAllBlocks();
        const proofs = await getAllProofs();
        const balances = await getAllBalances();
        return new Response(JSON.stringify({
          blocks: blocks.length,
          proofs: proofs.length,
          balances: balances.length,
          latest_hash: await getLatestBlockHash(),
          chain_valid: (await verifyChain()).valid
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (url.pathname === "/api/blocks" && url.searchParams.has("actor")) {
        const actor = url.searchParams.get("actor");
        const blocks = await getAllBlocks();
        const filteredBlocks = blocks.filter(block => block.actor.did === actor);
        return new Response(JSON.stringify({
          blocks: filteredBlocks,
          total: filteredBlocks.length,
          latest_hash: await getLatestBlockHash()
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (url.pathname === "/api/blocks" && url.searchParams.has("intent")) {
        const intent = url.searchParams.get("intent");
        const blocks = await getAllBlocks();
        const filteredBlocks = blocks.filter(block => block.intent === intent);
        return new Response(JSON.stringify({
          blocks: filteredBlocks,
          total: filteredBlocks.length,
          latest_hash: await getLatestBlockHash()
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (url.pathname === "/api/blocks" && url.searchParams.has("hash")) {
        const hash = url.searchParams.get("hash");
        const blocks = await getAllBlocks();
        const filteredBlocks = blocks.filter(block => block.hash === hash);
        return new Response(JSON.stringify({
          blocks: filteredBlocks,
          total: filteredBlocks.length,
          latest_hash: await getLatestBlockHash()
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (url.pathname === "/api/tx") {
        const hash = url.searchParams.get("hash");
        const blocks = await getAllBlocks();
        const txBlock = blocks.find(block => block.hash === hash);
        return new Response(JSON.stringify(txBlock), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      return new Response("Not found", { 
        status: 404,
        headers: corsHeaders
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  });
  console.log(`✅ Explorer server started on http://localhost:${port}`);
  console.log(`🔌 WebSocket endpoint available at ws://localhost:${port}/ws`);
}
export async function broadcastBlockchainUpdate(): Promise<void> {
  try {
    const blocks = await getAllBlocks();
    const proofs = await getAllProofs();
    const balances = await getAllBalances();
    const latestHash = await getLatestBlockHash();
    const chainValid = (await verifyChain()).valid;
    const update = {
      stats: {
        blocks: blocks.length,
        proofs: proofs.length,
        balances: balances.length,
        latest_hash: latestHash,
        chain_valid: chainValid
      },
      latest_blocks: blocks
        .sort((a, b) => b.ts - a.ts)
        .slice(0, 10) 
    };
    broadcastUpdate("blockchain_update", update);
  } catch (error) {
    console.error("Failed to broadcast blockchain update:", error);
  }
}
function createExplorerHTML(): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>FRAME Blockchain Explorer</title>
    <style>
        body { font-family: monospace; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: #333; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .stat-card { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .blocks { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .block { border: 1px solid #ddd; padding: 10px; margin: 10px 0; border-radius: 4px; }
        .hash { font-family: monospace; color: #666; font-size: 12px; }
        .timestamp { color: #999; font-size: 12px; }
        .actor { color: #0066cc; font-weight: bold; }
        .refresh { background: #0066cc; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
        .refresh:hover { background: #0052a3; }
        .error { color: red; }
        .success { color: green; }
        .status { padding: 10px; border-radius: 4px; margin-bottom: 10px; }
        .status.connected { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .status.disconnected { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .status.connecting { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
        .new-block { animation: highlight 2s ease-out; }
        @keyframes highlight { 0% { background: #fff3cd; } 100% { background: white; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔗 FRAME Blockchain Explorer</h1>
            <p>Real-time blockchain data and verification</p>
        </div>
        <div id="connectionStatus" class="status connecting">
            🔄 Connecting to WebSocket...
        </div>
        <div class="stats" id="stats">
            <div class="stat-card">
                <h3>Blocks</h3>
                <div id="blockCount">Loading...</div>
            </div>
            <div class="stat-card">
                <h3>Proofs</h3>
                <div id="proofCount">Loading...</div>
            </div>
            <div class="stat-card">
                <h3>Balances</h3>
                <div id="balanceCount">Loading...</div>
            </div>
            <div class="stat-card">
                <h3>Chain Valid</h3>
                <div id="chainValid">Loading...</div>
            </div>
        </div>
        <div style="margin-bottom: 20px;">
            <button class="refresh" onclick="loadData()">🔄 Refresh Data</button>
            <button class="refresh" onclick="downloadChain()">📥 Download Chain</button>
            <button class="refresh" onclick="connectWebSocket()">🔌 Reconnect WebSocket</button>
        </div>
        <div class="blocks">
            <h2>Latest Blocks <span id="liveIndicator" style="color: #28a745; display: none;">● LIVE</span></h2>
            <div id="blocks">Loading blocks...</div>
        </div>
    </div>
    <script>
        let ws = null;
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 5;
        function updateConnectionStatus(status, message) {
            const statusEl = document.getElementById('connectionStatus');
            statusEl.className = 'status ' + status;
            statusEl.innerHTML = message;
        }
        function connectWebSocket() {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
            try {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsUrl = protocol + '//' + window.location.host + '/ws';
                ws = new WebSocket(wsUrl);
                ws.onopen = function() {
                    updateConnectionStatus('connected', '✅ Connected to WebSocket - Live updates enabled');
                    reconnectAttempts = 0;
                    document.getElementById('liveIndicator').style.display = 'inline';
                    // Request initial update
                    ws.send(JSON.stringify({ type: 'request_update' }));
                };
                ws.onmessage = function(event) {
                    try {
                        const message = JSON.parse(event.data);
                        switch (message.type) {
                            case 'connected':
                                console.log('WebSocket connected:', message.message);
                                break;
                            case 'blockchain_update':
                                updateBlockchainData(message.data);
                                break;
                            case 'pong':
                                console.log('Pong received');
                                break;
                            default:
                                console.log('Unknown message type:', message.type);
                        }
                    } catch (error) {
                        console.error('Failed to parse WebSocket message:', error);
                    }
                };
                ws.onclose = function() {
                    updateConnectionStatus('disconnected', '❌ WebSocket disconnected');
                    document.getElementById('liveIndicator').style.display = 'none';
                    // Attempt to reconnect
                    if (reconnectAttempts < maxReconnectAttempts) {
                        reconnectAttempts++;
                        setTimeout(() => {
                            updateConnectionStatus('connecting', '🔄 Reconnecting... (Attempt ' + reconnectAttempts + ')');
                            connectWebSocket();
                        }, 2000 * reconnectAttempts);
                    } else {
                        updateConnectionStatus('disconnected', '❌ WebSocket disconnected - Max reconnection attempts reached');
                    }
                };
                ws.onerror = function(error) {
                    console.error('WebSocket error:', error);
                    updateConnectionStatus('disconnected', '❌ WebSocket error');
                };
            } catch (error) {
                console.error('Failed to create WebSocket:', error);
                updateConnectionStatus('disconnected', '❌ Failed to create WebSocket connection');
            }
        }
        function updateBlockchainData(data) {
            // Update stats
            if (data.stats) {
                document.getElementById('blockCount').textContent = data.stats.blocks;
                document.getElementById('proofCount').textContent = data.stats.proofs;
                document.getElementById('balanceCount').textContent = data.stats.balances;
                document.getElementById('chainValid').textContent = data.stats.chain_valid ? '✅ Valid' : '❌ Invalid';
                document.getElementById('chainValid').className = data.stats.chain_valid ? 'success' : 'error';
            }
            // Update blocks
            if (data.latest_blocks) {
                const blocksHtml = data.latest_blocks.map(block => \`
                    <div class="block" data-hash="\${block.hash}">
                        <div class="hash">Hash: \${block.hash.substring(0, 32)}...</div>
                        <div class="hash">Prev: \${block.prev.substring(0, 32)}...</div>
                        <div class="hash">Intent: \${block.intent.substring(0, 32)}...</div>
                        <div class="actor">Actor: \${block.actor.did}</div>
                        <div class="timestamp">Time: \${new Date(block.ts).toISOString()}</div>
                    </div>
                \`).join('');
                const blocksContainer = document.getElementById('blocks');
                const currentBlocks = blocksContainer.innerHTML;
                if (currentBlocks !== blocksHtml) {
                    blocksContainer.innerHTML = blocksHtml || 'No blocks found';
                    // Highlight new blocks
                    const newBlocks = blocksContainer.querySelectorAll('.block');
                    newBlocks.forEach(block => {
                        block.classList.add('new-block');
                        setTimeout(() => block.classList.remove('new-block'), 2000);
                    });
                }
            }
        }
        async function loadData() {
            try {
                // Load stats
                const statsResponse = await fetch('/api/stats');
                const stats = await statsResponse.json();
                document.getElementById('blockCount').textContent = stats.blocks;
                document.getElementById('proofCount').textContent = stats.proofs;
                document.getElementById('balanceCount').textContent = stats.balances;
                document.getElementById('chainValid').textContent = stats.chain_valid ? '✅ Valid' : '❌ Invalid';
                document.getElementById('chainValid').className = stats.chain_valid ? 'success' : 'error';
                // Load blocks
                const blocksResponse = await fetch('/api/blocks');
                const blocksData = await blocksResponse.json();
                const blocksHtml = blocksData.blocks.map(block => \`
                    <div class="block">
                        <div class="hash">Hash: \${block.hash.substring(0, 32)}...</div>
                        <div class="hash">Prev: \${block.prev.substring(0, 32)}...</div>
                        <div class="hash">Intent: \${block.intent.substring(0, 32)}...</div>
                        <div class="actor">Actor: \${block.actor.did}</div>
                        <div class="timestamp">Time: \${new Date(block.ts).toISOString()}</div>
                    </div>
                \`).join('');
                document.getElementById('blocks').innerHTML = blocksHtml || 'No blocks found';
            } catch (error) {
                console.error('Failed to load data:', error);
                document.getElementById('blocks').innerHTML = '<div class="error">Failed to load data</div>';
            }
        }
        async function downloadChain() {
            try {
                const response = await fetch('/api/chain.jsonl');
                const chainData = await response.text();
                const blob = new Blob([chainData], { type: 'application/jsonl' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'frame-chain.jsonl';
                a.click();
                URL.revokeObjectURL(url);
            } catch (error) {
                console.error('Failed to download chain:', error);
            }
        }
        // Initialize on page load
        document.addEventListener('DOMContentLoaded', function() {
            // Load initial data
            loadData();
            // Connect to WebSocket
            connectWebSocket();
            // Fallback refresh every 30 seconds if WebSocket is not available
            setInterval(() => {
                if (!ws || ws.readyState !== WebSocket.OPEN) {
                    loadData();
                }
            }, 30000);
        });
    </script>
</body>
</html>
  `;
} 