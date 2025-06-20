// frame.js: Core FRAME logic for identities, capabilities, intents, agent
import { Storage } from './storage.js';
import { 
  generateKeyPair, 
  exportKeyPair, 
  importPrivateKey, 
  importPublicKey, 
  sign, 
  verify, 
  hash, 
  arrayBufferToBase64, 
  base64ToArrayBuffer 
} from './crypto.js';

class Frame {
  constructor() {
    this.storage = new Storage();
    this.agentInterval = null;
    this.currentIdentity = null;
    this.logCallbacks = [];
    
    this.loadCurrentIdentity();
  }

  async loadCurrentIdentity() {
    const saved = localStorage.getItem('frame_identity');
    if (saved) {
      this.currentIdentity = saved;
    }
  }

  setCurrentIdentity(identity) {
    this.currentIdentity = identity;
    localStorage.setItem('frame_identity', identity);
  }

  // Identity Management
  async createIdentity(name) {
    const keyPair = await generateKeyPair();
    const exportedKeys = await exportKeyPair(keyPair);
    const identity = `did:frame:${name}`;
    
    const identityData = {
      name,
      did: identity,
      publicKey: exportedKeys.publicKey,
      privateKey: exportedKeys.privateKey,
      created_at: new Date().toISOString()
    };

    await this.storage.setIdentity(identity, identityData);
    this.log(`✅ Created identity: ${identity}`);
    return identity;
  }

  async getIdentities() {
    const identities = await this.storage.getIdentities();
    return Object.values(identities);
  }

  // Token Management
  async getBalance(identity) {
    const balance = await this.storage.getBalance(identity);
    return balance || 0;
  }

  async mintTokens(identity, amount) {
    const currentBalance = await this.getBalance(identity);
    const newBalance = currentBalance + amount;
    await this.storage.setBalance(identity, newBalance);
    this.log(`💰 Minted ${amount} tokens for ${identity}. New balance: ${newBalance}`);
    return newBalance;
  }

  async transferTokens(from, to, amount) {
    const fromBalance = await this.getBalance(from);
    if (fromBalance < amount) {
      throw new Error(`Insufficient balance: ${fromBalance} < ${amount}`);
    }
    
    const toBalance = await this.getBalance(to);
    
    await this.storage.setBalance(from, fromBalance - amount);
    await this.storage.setBalance(to, toBalance + amount);
    
    this.log(`💸 Transferred ${amount} tokens from ${from} to ${to}`);
    return { from: fromBalance - amount, to: toBalance + amount };
  }

  // Capability Management
  async grantCapability(issuer, action, audience, expiresAt = null) {
    // Ensure issuer and audience are identity objects
    if (typeof issuer === 'string') {
      const resolved = await this.getIdentity(issuer);
      if (!resolved) {
        console.warn('grantCapability: Could not resolve issuer', issuer);
        throw new Error('Identity not found: ' + issuer);
      }
      issuer = resolved;
    }
    if (typeof audience === 'string') {
      const resolved = await this.getIdentity(audience);
      if (!resolved) {
        console.warn('grantCapability: Could not resolve audience', audience);
        throw new Error('Identity not found: ' + audience);
      }
      audience = resolved;
    }

    const capability = {
      issuer: issuer.did,
      audience: audience.did,
      action: action,
      issued_at: new Date().toISOString(),
      expires_at: expiresAt
    };

    console.log('Capability to sign:', capability);

    // Import the private key from JWK format
    const privateKey = await importPrivateKey(issuer.privateKey);
    console.log('Private key imported successfully:', privateKey);
    
    const signatureBuffer = await sign(privateKey, JSON.stringify(capability));
    console.log('Signature buffer created:', signatureBuffer);
    
    const signature = arrayBufferToBase64(signatureBuffer);
    console.log('Signature base64:', signature);
    
    capability.signature = signature;

    const key = `cap:${action}:${audience.did}`;
    await this.storage.setCapability(key, capability);
    
    this.log(`🔑 Granted capability: ${action} → ${audience.did}`);
    return capability;
  }

  async getCapabilities() {
    const capabilities = await this.storage.getCapabilities();
    return Object.entries(capabilities).map(([key, cap]) => ({
      key,
      ...cap
    }));
  }

  async revokeCapability(action, audience) {
    const key = `cap:${action}:${audience}`;
    const capability = await this.storage.getCapability(key);
    if (capability) {
      capability.revoked = true;
      capability.revoked_at = new Date().toISOString();
      await this.storage.setCapability(key, capability);
      this.log(`🚫 Revoked capability: ${action} → ${audience}`);
    }
  }

  // Trust Management
  async setTrust(from, to, score = 0.5) {
    const trust = {
      from,
      to,
      score,
      created_at: new Date().toISOString()
    };
    await this.storage.setTrust(`${from}:${to}`, trust);
    this.log(`🤝 Set trust: ${from} → ${to} (${score})`);
  }

  async getTrust(from, to) {
    return await this.storage.getTrust(`${from}:${to}`);
  }

  async getTrusts() {
    return await this.storage.getTrusts();
  }

  // Peer Management
  async addPeer(peerId, url, trustScore = 0.5) {
    const peer = {
      id: peerId,
      url,
      trust: trustScore,
      added_at: new Date().toISOString()
    };
    await this.storage.setPeer(peerId, peer);
    this.log(`📡 Added peer: ${peerId} (${url})`);
  }

  async getPeers() {
    return await this.storage.getPeers();
  }

  async updatePeerTrust(peerId, score) {
    const peer = await this.storage.getPeer(peerId);
    if (peer) {
      peer.trust = score;
      peer.updated_at = new Date().toISOString();
      await this.storage.setPeer(peerId, peer);
      this.log(`📊 Updated peer trust: ${peerId} → ${score}`);
    }
  }

  // Staking
  async defineStakingConfig(capability, amount, lockPeriod, description) {
    const config = {
      capability,
      amount,
      lockPeriod,
      description,
      created_at: new Date().toISOString()
    };
    await this.storage.setStakingConfig(capability, config);
    this.log(`🔒 Defined staking for ${capability}: ${amount} tokens for ${lockPeriod}ms`);
  }

  async stakeForCapability(issuer, grantee, capability) {
    const config = await this.storage.getStakingConfig(capability);
    if (!config) {
      throw new Error(`No staking config found for ${capability}`);
    }

    const stake = {
      id: `stake_${Date.now()}`,
      issuer,
      grantee,
      capability,
      amount: config.amount,
      locked_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + config.lockPeriod).toISOString(),
      isActive: true
    };

    await this.storage.setStake(stake.id, stake);
    this.log(`🔒 Staked ${config.amount} tokens for ${capability} capability`);
    return stake.id;
  }

  async unlockStake(identity, action) {
    const stakes = await this.getStakes();
    const stake = stakes.find(s => s.issuer === identity && s.capability === action);
    if (stake && stake.isActive) {
      stake.isActive = false;
      stake.unlocked_at = new Date().toISOString();
      await this.storage.setStake(stake.id, stake);
      this.log(`🔓 Unlocked stake: ${stake.id}`);
    }
  }

  async getStakes() {
    return await this.storage.getStakes();
  }

  // Reflex Rules
  async createReflex(condition, action) {
    const reflex = {
      id: `reflex_${Date.now()}`,
      condition,
      action,
      created_at: new Date().toISOString(),
      triggerCount: 0,
      enabled: true
    };
    
    await this.storage.setReflex(reflex.id, reflex);
    this.log(`🧠 Created reflex: ${condition} → ${action}`);
    return reflex.id;
  }

  async getReflexes() {
    return await this.storage.getReflexes();
  }

  async checkReflexes() {
    const reflexes = await this.getReflexes();
    const activeReflexes = reflexes.filter(r => r.enabled);
    
    for (const reflex of activeReflexes) {
      try {
        // Simple condition evaluation (in a real implementation, this would be more sophisticated)
        const shouldTrigger = await this.evaluateCondition(reflex.condition);
        if (shouldTrigger) {
          await this.executeReflex(reflex);
        }
      } catch (error) {
        this.log(`Error checking reflex ${reflex.id}: ${error.message}`, 'error');
      }
    }
  }

  async evaluateCondition(condition) {
    // Simple condition evaluation - in a real implementation this would be more sophisticated
    if (condition.includes('balance <')) {
      const amount = parseInt(condition.match(/\d+/)[0]);
      const balance = await this.getBalance(this.currentIdentity);
      return balance < amount;
    }
    return false;
  }

  async executeReflex(reflex) {
    try {
      await this.executeIntent(reflex.action, reflex.action);
      reflex.triggerCount++;
      reflex.lastTriggered = new Date().toISOString();
      await this.storage.setReflex(reflex.id, reflex);
      this.log(`🧠 Reflex triggered: ${reflex.condition} → ${reflex.action}`);
    } catch (error) {
      this.log(`Error executing reflex ${reflex.id}: ${error.message}`, 'error');
    }
  }

  // Chain Operations
  async addToChain(intentId, actor) {
    const chainEntry = {
      id: intentId,
      actor,
      timestamp: new Date().toISOString(),
      hash: await hash(`${intentId}:${actor}:${Date.now()}`)
    };
    await this.storage.addChainEntry(chainEntry);
    this.log(`🔗 Added to chain: ${intentId} by ${actor}`);
  }

  async getChain() {
    return await this.storage.getChain();
  }

  async verifyChain() {
    const chain = await this.getChain();
    // Simple verification - in real implementation would verify hashes
    this.log(`🔍 Chain verification: ${chain.length} entries`);
    return chain.length > 0;
  }

  // Intent Management
  async submitIntent(url, execute = false) {
    const intent = {
      url,
      submitted_at: new Date().toISOString(),
      executed: false,
      executed_at: null,
      actor: this.currentIdentity
    };

    const intentId = await hash(url);
    await this.storage.setIntent(intentId, intent);
    
    // Add to chain
    await this.addToChain(intentId, this.currentIdentity);
    
    this.log(`📝 Submitted intent: ${url}`);
    
    if (execute) {
      await this.executeIntent(intentId, intent);
    }
    
    return intentId;
  }

  async getIntents() {
    const intents = await this.storage.getIntents();
    return Object.entries(intents).map(([id, intent]) => ({
      id,
      ...intent
    }));
  }

  async executeIntent(intentId, intent) {
    if (!intent.url || typeof intent.url !== 'string') {
      this.log(`❌ Invalid intent URL: ${intent.url}`);
      return false;
    }
    const url = new URL(intent.url);
    const action = url.hostname;
    const params = Object.fromEntries(url.searchParams);
    
    const capabilities = await this.getCapabilities();
    const matchingCap = capabilities.find(cap => 
      cap.action === action && 
      cap.audience === this.currentIdentity &&
      !cap.revoked &&
      (!cap.expires_at || new Date(cap.expires_at) > new Date())
    );

    if (!matchingCap) {
      this.log(`❌ No capability match for: ${action}`);
      return false;
    }

    const issuerIdentity = await this.storage.getIdentity(matchingCap.issuer);
    if (!issuerIdentity) {
      this.log(`❌ Issuer identity not found: ${matchingCap.issuer}`);
      return false;
    }

    const publicKey = await importPublicKey(issuerIdentity.publicKey);
    const signatureBuffer = base64ToArrayBuffer(matchingCap.signature);
    
    const isValid = await verify(
      publicKey,
      signatureBuffer,
      JSON.stringify({
        issuer: matchingCap.issuer,
        audience: matchingCap.audience,
        action: matchingCap.action,
        issued_at: matchingCap.issued_at,
        expires_at: matchingCap.expires_at
      })
    );

    if (!isValid) {
      this.log(`❌ Invalid signature for capability: ${action} → ${matchingCap.audience}`);
      return false;
    }

    intent.executed = true;
    intent.executed_at = new Date().toISOString();
    intent.result = `Executed ${action} with params: ${JSON.stringify(params)}`;
    
    await this.storage.setIntent(intentId, intent);
    
    this.log(`✅ Executed intent: ${action}`, 'success');
    return true;
  }

  // Agent Management
  async startAgent(identity) {
    if (this.agentInterval) {
      this.stopAgent();
    }

    this.currentIdentity = identity;
    this.setCurrentIdentity(identity);
    
    this.log(`🤖 Agent started: ${identity}`);
    this.log(`⏰ Polling for intents every 5 seconds...`);
    
    let cycle = 0;
    this.agentInterval = setInterval(async () => {
      cycle++;
      const time = new Date().toLocaleTimeString();
      this.log(`🔄 Cycle ${cycle} - ${time}`);
      
      const intents = await this.getIntents();
      const pendingIntents = intents.filter(i => !i.executed);
      
      this.log(`🔍 Checking ${pendingIntents.length} pending intents...`);
      
      for (const intent of pendingIntents) {
        await this.executeIntent(intent.id, intent);
      }
    }, 5000);
  }

  stopAgent() {
    if (this.agentInterval) {
      clearInterval(this.agentInterval);
      this.agentInterval = null;
      this.log(`🛑 Agent stopped`);
    }
  }

  isAgentRunning() {
    return this.agentInterval !== null;
  }

  // Utility Methods
  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      timestamp,
      message,
      type
    };
    
    this.storage.addLog(logEntry);
    
    this.logCallbacks.forEach(callback => callback(logEntry));
  }

  onLog(callback) {
    this.logCallbacks.push(callback);
  }

  async getLogs() {
    return await this.storage.getLogs();
  }

  async clearLogs() {
    await this.storage.clearLogs();
  }

  // Repair Functions
  async repairIdentities() {
    const identities = await this.getIdentities();
    let repaired = 0;
    
    for (const identity of identities) {
      if (!identity.publicKey || !identity.privateKey) {
        // Regenerate keys for corrupted identity
        const keyPair = await generateKeyPair();
        const exportedKeys = await exportKeyPair(keyPair);
        
        identity.publicKey = exportedKeys.publicKey;
        identity.privateKey = exportedKeys.privateKey;
        identity.repaired_at = new Date().toISOString();
        
        await this.storage.setIdentity(identity.did, identity);
        repaired++;
      }
    }
    
    this.log(`🔧 Repaired ${repaired} identities`);
    return repaired;
  }

  async repairCapabilities() {
    const capabilities = await this.getCapabilities();
    let repaired = 0;
    
    for (const capability of capabilities) {
      if (!capability.signature) {
        // Re-sign capability
        const issuerIdentity = await this.storage.getIdentity(capability.issuer);
        if (issuerIdentity) {
          const privateKey = await importPrivateKey(issuerIdentity.privateKey);
          const signatureBuffer = await sign(privateKey, JSON.stringify({
            issuer: capability.issuer,
            audience: capability.audience,
            action: capability.action,
            issued_at: capability.issued_at,
            expires_at: capability.expires_at
          }));
          
          capability.signature = arrayBufferToBase64(signatureBuffer);
          capability.repaired_at = new Date().toISOString();
          
          await this.storage.setCapability(capability.key, capability);
          repaired++;
        }
      }
    }
    
    this.log(`🔧 Repaired ${repaired} capabilities`);
    return repaired;
  }

  async getCurrentIdentity() {
    // Try to resolve the current identity from storage
    let id = this.currentIdentity;
    if (!id) return null;
    // If it's a DID, try to get by DID, else by name
    let identity = await this.getIdentity(id);
    if (!identity && id.startsWith('did:frame:')) {
      // Try to get by name
      const name = id.replace('did:frame:', '');
      identity = await this.getIdentity(name);
    }
    return identity;
  }

  async getIdentity(id) {
    // Try to get by DID, then by name
    let identity = await this.storage.getIdentity(id);
    if (!identity && id.startsWith('did:frame:')) {
      const name = id.replace('did:frame:', '');
      identity = await this.storage.getIdentity(name);
    }
    return identity;
  }
}

const frame = new Frame();
export default frame; 