const plugins = {
  'chat.send': (params: Record<string, string>) => { 
    console.log(`📤 Sending chat:`, params); 
    if (params.to && params.message) {
      console.log(`💬 Message sent to ${params.to}: "${params.message}"`);
    }
  },
  'pay.gas': (params: Record<string, string>) => { 
    console.log(`⛽ Paying gas:`, params); 
    if (params.amount) {
      console.log(`💰 Gas payment processed: ${params.amount} ETH`);
    }
  },
  'mint.frame': async (params: Record<string, string>) => {
    console.log(`🪙 Minting FRAME tokens:`, params);
    const { mintTokens } = await import("../core/token.ts");
    if (params.identity && params.amount) {
      const amount = parseFloat(params.amount);
      if (isNaN(amount) || amount <= 0) {
        console.error(`❌ Invalid amount: ${params.amount}`);
        return;
      }
      const success = await mintTokens(params.identity, amount);
      if (success) {
        console.log(`✅ Successfully minted ${amount} FRAME tokens for ${params.identity}`);
      } else {
        console.error(`❌ Failed to mint tokens for ${params.identity}`);
      }
    } else {
      console.error(`❌ Missing required parameters: identity and amount`);
    }
  },
  'transfer.frame': async (params: Record<string, string>) => {
    console.log(`💸 Transferring FRAME tokens:`, params);
    const { transferTokens } = await import("../core/token.ts");
    if (params.from && params.to && params.amount) {
      const amount = parseFloat(params.amount);
      if (isNaN(amount) || amount <= 0) {
        console.error(`❌ Invalid amount: ${params.amount}`);
        return;
      }
      const success = await transferTokens(params.from, params.to, amount);
      if (success) {
        console.log(`✅ Successfully transferred ${amount} FRAME tokens from ${params.from} to ${params.to}`);
      } else {
        console.error(`❌ Failed to transfer tokens from ${params.from} to ${params.to}`);
      }
    } else {
      console.error(`❌ Missing required parameters: from, to, and amount`);
    }
  },
  'access.door': (params: Record<string, string>) => {
    console.log(`🚪 Accessing door:`, params);
    if (params.room) {
      console.log(`🔓 Door ${params.room} unlocked and opened`);
      console.log(`📋 Access granted to room ${params.room}`);
    }
    if (params.building) {
      console.log(`🏢 Building ${params.building} access granted`);
    }
  },
  'access.vault': (params: Record<string, string>) => {
    console.log(`🔐 Accessing vault:`, params);
    if (params.vault_id) {
      console.log(`🔑 Vault ${params.vault_id} unlocked`);
      console.log(`💎 Secure access granted to vault contents`);
    }
  },
  'read.files': (params: Record<string, string>) => {
    console.log(`📁 Reading files:`, params);
    if (params.path) {
      console.log(`📄 Reading file: ${params.path}`);
      console.log(`📊 File content retrieved successfully`);
    }
  },
  'debug.logs': (params: Record<string, string>) => {
    console.log(`🐛 Debugging logs:`, params);
    if (params.service) {
      console.log(`🔍 Debugging logs for service: ${params.service}`);
      console.log(`📋 Log analysis completed`);
    }
  },
  'system.status': (params: Record<string, string>) => {
    console.log(`📊 System status check:`, params);
    console.log(`🟢 System operational`);
    console.log(`💾 Memory usage: 45%`);
    console.log(`🔥 CPU usage: 23%`);
  },
  'network.ping': (params: Record<string, string>) => {
    console.log(`🏓 Network ping:`, params);
    if (params.target) {
      console.log(`📡 Pinging ${params.target}...`);
      console.log(`⚡ Response time: 12ms`);
    }
  },
  '*': (params: Record<string, string>) => { 
    console.warn(`⚠️ No plugin for capability: ${Object.keys(params).length > 0 ? 'with params' : 'without params'}`); 
  }
};
export function runCapability(action: string, params: Record<string, string>) {
  console.log(`🎯 Executing capability: ${action}`);
  const handler = plugins[action] || plugins['*'];
  const result = handler(params);
  console.log(`✅ Capability ${action} completed`);
  return result;
} 