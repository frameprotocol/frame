// storage.js: IndexedDB wrapper for FRAME
export const DB_NAME = 'frame-lite';
export const STORE_NAME = 'kv';

class Storage {
  constructor() {
    this.dbName = 'frame-db';
    this.dbVersion = 2;
    this.db = null;
    this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('identities')) {
          db.createObjectStore('identities', { keyPath: 'did' });
        }
        
        if (!db.objectStoreNames.contains('capabilities')) {
          db.createObjectStore('capabilities', { keyPath: 'key' });
        }
        
        if (!db.objectStoreNames.contains('intents')) {
          db.createObjectStore('intents', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('logs')) {
          db.createObjectStore('logs', { keyPath: 'timestamp', autoIncrement: true });
        }
        
        if (!db.objectStoreNames.contains('tokens')) {
          db.createObjectStore('tokens', { keyPath: 'identity' });
        }
        
        if (!db.objectStoreNames.contains('trusts')) {
          db.createObjectStore('trusts', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('peers')) {
          db.createObjectStore('peers', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('stakes')) {
          db.createObjectStore('stakes', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('reflexes')) {
          db.createObjectStore('reflexes', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('chain')) {
          db.createObjectStore('chain', { keyPath: 'id' });
        }
      };
    });
  }

  async waitForDB() {
    if (!this.db) {
      await this.init();
    }
  }

  async setIdentity(did, identityData) {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['identities'], 'readwrite');
      const store = transaction.objectStore('identities');
      const request = store.put(identityData);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getIdentity(did) {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['identities'], 'readonly');
      const store = transaction.objectStore('identities');
      const request = store.get(did);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getIdentities() {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['identities'], 'readonly');
      const store = transaction.objectStore('identities');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const identities = {};
        request.result.forEach(identity => {
          identities[identity.did] = identity;
        });
        resolve(identities);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async setBalance(identity, balance) {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['tokens'], 'readwrite');
      const store = transaction.objectStore('tokens');
      const request = store.put({ identity, balance });
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getBalance(identity) {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['tokens'], 'readonly');
      const store = transaction.objectStore('tokens');
      const request = store.get(identity);
      
      request.onsuccess = () => resolve(request.result ? request.result.balance : 0);
      request.onerror = () => reject(request.error);
    });
  }

  async setCapability(key, capabilityData) {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['capabilities'], 'readwrite');
      const store = transaction.objectStore('capabilities');
      const request = store.put({ key, ...capabilityData });
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getCapability(key) {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['capabilities'], 'readonly');
      const store = transaction.objectStore('capabilities');
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getCapabilities() {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['capabilities'], 'readonly');
      const store = transaction.objectStore('capabilities');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const capabilities = {};
        request.result.forEach(cap => {
          capabilities[cap.key] = cap;
        });
        resolve(capabilities);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async setTrust(id, trustData) {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['trusts'], 'readwrite');
      const store = transaction.objectStore('trusts');
      const request = store.put({ id, ...trustData });
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getTrust(id) {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['trusts'], 'readonly');
      const store = transaction.objectStore('trusts');
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getTrusts() {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['trusts'], 'readonly');
      const store = transaction.objectStore('trusts');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async setPeer(id, peerData) {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['peers'], 'readwrite');
      const store = transaction.objectStore('peers');
      const request = store.put({ id, ...peerData });
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getPeer(id) {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['peers'], 'readonly');
      const store = transaction.objectStore('peers');
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getPeers() {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['peers'], 'readonly');
      const store = transaction.objectStore('peers');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async setStake(id, stakeData) {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['stakes'], 'readwrite');
      const store = transaction.objectStore('stakes');
      const request = store.put({ id, ...stakeData });
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getStake(id) {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['stakes'], 'readonly');
      const store = transaction.objectStore('stakes');
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getStakes() {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['stakes'], 'readonly');
      const store = transaction.objectStore('stakes');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async addChainEntry(entry) {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['chain'], 'readwrite');
      const store = transaction.objectStore('chain');
      const request = store.put(entry);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getChain() {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['chain'], 'readonly');
      const store = transaction.objectStore('chain');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async setIntent(id, intentData) {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['intents'], 'readwrite');
      const store = transaction.objectStore('intents');
      const request = store.put({ id, ...intentData });
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getIntents() {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['intents'], 'readonly');
      const store = transaction.objectStore('intents');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const intents = {};
        request.result.forEach(intent => {
          intents[intent.id] = intent;
        });
        resolve(intents);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async addLog(logEntry) {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['logs'], 'readwrite');
      const store = transaction.objectStore('logs');
      const request = store.put(logEntry);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getLogs() {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['logs'], 'readonly');
      const store = transaction.objectStore('logs');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearLogs() {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['logs'], 'readwrite');
      const store = transaction.objectStore('logs');
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Reflex Methods
  async setReflex(id, reflexData) {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['reflexes'], 'readwrite');
      const store = transaction.objectStore('reflexes');
      const request = store.put({ id, ...reflexData });
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getReflex(id) {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['reflexes'], 'readonly');
      const store = transaction.objectStore('reflexes');
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getReflexes() {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['reflexes'], 'readonly');
      const store = transaction.objectStore('reflexes');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteReflex(id) {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['reflexes'], 'readwrite');
      const store = transaction.objectStore('reflexes');
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export { Storage }; 