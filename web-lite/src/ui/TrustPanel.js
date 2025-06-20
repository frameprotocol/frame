import frame from '../frame.js';
import '../ui/StepIndicator.js';

class TrustPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.loadData();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 16px;
          padding-bottom: 80px;
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .section {
          background: white;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .section-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 16px;
          color: #1f2937;
        }
        
        .form-group {
          margin-bottom: 16px;
        }
        
        .form-label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 6px;
          color: #374151;
        }
        
        .form-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s;
        }
        
        .form-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .form-select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          background: white;
        }
        
        .form-range {
          width: 100%;
          margin: 8px 0;
        }
        
        .range-value {
          text-align: center;
          font-size: 14px;
          color: #6b7280;
          margin-top: 4px;
        }
        
        .btn {
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          margin-right: 8px;
          margin-bottom: 8px;
        }
        
        .btn-primary {
          background: #3b82f6;
          color: white;
        }
        
        .btn-primary:hover {
          background: #2563eb;
        }
        
        .btn-success {
          background: #10b981;
          color: white;
        }
        
        .btn-success:hover {
          background: #059669;
        }
        
        .btn-danger {
          background: #ef4444;
          color: white;
        }
        
        .btn-danger:hover {
          background: #dc2626;
        }
        
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 16px;
        }
        
        .list {
          max-height: 300px;
          overflow-y: auto;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }
        
        .list-item {
          padding: 12px 16px;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .list-item:last-child {
          border-bottom: none;
        }
        
        .list-item-info {
          flex: 1;
        }
        
        .list-item-title {
          font-weight: 500;
          color: #1f2937;
          margin-bottom: 2px;
        }
        
        .list-item-subtitle {
          font-size: 12px;
          color: #6b7280;
        }
        
        .trust-score {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .trust-high {
          background: #d1fae5;
          color: #065f46;
        }
        
        .trust-medium {
          background: #fef3c7;
          color: #92400e;
        }
        
        .trust-low {
          background: #fee2e2;
          color: #991b1b;
        }
        
        .status {
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 16px;
          font-size: 14px;
        }
        
        .status.success {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }
        
        .status.error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }
        
        @media (max-width: 768px) {
          .grid {
            grid-template-columns: 1fr;
          }
          
          :host {
            padding: 12px;
          }
          
          .section {
            padding: 16px;
          }
        }
        
        .info {
          display: inline-block;
          margin-left: 8px;
          cursor: pointer;
          color: #3b82f6;
          font-size: 1.1em;
        }
        .tooltip {
          display: none;
          position: absolute;
          background: #fff;
          color: #1f2937;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 10px;
          font-size: 13px;
          z-index: 100;
          max-width: 260px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .info:hover + .tooltip, .info:focus + .tooltip {
          display: block;
        }
        .section-title-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
        }
      </style>
      
      <step-indicator step="1"></step-indicator>
      <div class="container">
        <div class="section">
          <div class="section-title-wrap">
            <h2 class="section-title">Trust Graph</h2>
            <span class="info" tabindex="0">ℹ️</span>
            <div class="tooltip">The Trust Graph lets you set how much you trust other digital selves and peers. Use this to build your network of trusted identities.</div>
          </div>
          <form id="trust-form">
            <div class="form-group">
              <label class="form-label" for="trust-from">From Identity</label>
              <select id="trust-from" class="form-select" required>
                <option value="">Select identity...</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="trust-to">To Identity</label>
              <input type="text" id="trust-to" class="form-input" placeholder="did:frame:bob" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="trust-score">Trust Score</label>
              <input type="range" id="trust-score" class="form-range" min="0" max="1" step="0.1" value="0.5">
              <div class="range-value" id="trust-score-value">0.5</div>
            </div>
            <button type="submit" class="btn btn-success">Trust This Identity</button>
          </form>
        </div>
        
        <div class="section">
          <h2 class="section-title">Add Peer</h2>
          <form id="peer-form">
            <div class="form-group">
              <label class="form-label" for="peer-id">Peer ID</label>
              <input type="text" id="peer-id" class="form-input" placeholder="peer123" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="peer-url">Peer URL</label>
              <input type="url" id="peer-url" class="form-input" placeholder="https://peer.example.com" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="peer-trust">Initial Trust Score</label>
              <input type="range" id="peer-trust" class="form-range" min="0" max="1" step="0.1" value="0.5">
              <div class="range-value" id="peer-trust-value">0.5</div>
            </div>
            <button type="submit" class="btn btn-primary">Add Peer</button>
          </form>
        </div>
        
        <div class="section">
          <h2 class="section-title">Trust & Peer Management</h2>
          <button id="refresh-data" class="btn btn-primary">Refresh Data</button>
          
          <div class="grid">
            <div>
              <h3 style="margin-bottom: 12px; font-size: 16px; color: #374151;">Trust Relationships</h3>
              <div id="trust-list" class="list"></div>
            </div>
            <div>
              <h3 style="margin-bottom: 12px; font-size: 16px; color: #374151;">Peers</h3>
              <div id="peer-list" class="list"></div>
            </div>
          </div>
        </div>
        
        <div id="status" class="status" style="display: none;"></div>
      </div>
    `;
  }

  setupEventListeners() {
    const trustForm = this.shadowRoot.getElementById('trust-form');
    const peerForm = this.shadowRoot.getElementById('peer-form');
    const refreshBtn = this.shadowRoot.getElementById('refresh-data');
    const trustScore = this.shadowRoot.getElementById('trust-score');
    const trustScoreValue = this.shadowRoot.getElementById('trust-score-value');
    const peerTrust = this.shadowRoot.getElementById('peer-trust');
    const peerTrustValue = this.shadowRoot.getElementById('peer-trust-value');
    
    trustForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.setTrust();
    });
    
    peerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.addPeer();
    });
    
    refreshBtn.addEventListener('click', () => {
      this.loadData();
    });
    
    trustScore.addEventListener('input', (e) => {
      trustScoreValue.textContent = e.target.value;
    });
    
    peerTrust.addEventListener('input', (e) => {
      peerTrustValue.textContent = e.target.value;
    });
  }

  async setTrust() {
    const fromSelect = this.shadowRoot.getElementById('trust-from');
    const toInput = this.shadowRoot.getElementById('trust-to');
    const scoreInput = this.shadowRoot.getElementById('trust-score');
    
    const from = fromSelect.value;
    const to = toInput.value.trim();
    const score = parseFloat(scoreInput.value);
    
    if (!from || !to) {
      this.showStatus('Please fill in all fields', 'error');
      return;
    }
    
    try {
      await frame.setTrust(from, to, score);
      toInput.value = '';
      scoreInput.value = '0.5';
      this.shadowRoot.getElementById('trust-score-value').textContent = '0.5';
      this.showStatus(`Set trust: ${from} → ${to} (${score})`, 'success');
      await this.loadData();
    } catch (error) {
      this.showStatus(`Error setting trust: ${error.message}`, 'error');
    }
  }

  async addPeer() {
    const idInput = this.shadowRoot.getElementById('peer-id');
    const urlInput = this.shadowRoot.getElementById('peer-url');
    const trustInput = this.shadowRoot.getElementById('peer-trust');
    
    const id = idInput.value.trim();
    const url = urlInput.value.trim();
    const trust = parseFloat(trustInput.value);
    
    if (!id || !url) {
      this.showStatus('Please fill in all fields', 'error');
      return;
    }
    
    try {
      await frame.addPeer(id, url, trust);
      idInput.value = '';
      urlInput.value = '';
      trustInput.value = '0.5';
      this.shadowRoot.getElementById('peer-trust-value').textContent = '0.5';
      this.showStatus(`Added peer: ${id} (${url})`, 'success');
      await this.loadData();
    } catch (error) {
      this.showStatus(`Error adding peer: ${error.message}`, 'error');
    }
  }

  async loadData() {
    try {
      const identities = await frame.getIdentities();
      const trusts = await frame.getTrusts();
      const peers = await frame.getPeers();
      
      // Update trust form select
      const trustFromSelect = this.shadowRoot.getElementById('trust-from');
      trustFromSelect.innerHTML = '<option value="">Select identity...</option>';
      
      for (const identity of identities) {
        const option = document.createElement('option');
        option.value = identity.did;
        option.textContent = `${identity.name} (${identity.did})`;
        trustFromSelect.appendChild(option);
      }
      
      // Render trust list
      const trustList = this.shadowRoot.getElementById('trust-list');
      trustList.innerHTML = '';
      
      if (trusts.length === 0) {
        trustList.innerHTML = '<div class="list-item"><div class="list-item-info">No trust relationships found</div></div>';
      } else {
        for (const trust of trusts) {
          const trustClass = trust.score >= 0.7 ? 'trust-high' : trust.score >= 0.4 ? 'trust-medium' : 'trust-low';
          const listItem = document.createElement('div');
          listItem.className = 'list-item';
          listItem.innerHTML = `
            <div class="list-item-info">
              <div class="list-item-title">${trust.from} → ${trust.to}</div>
              <div class="list-item-subtitle">${new Date(trust.created_at).toLocaleDateString()}</div>
            </div>
            <span class="trust-score ${trustClass}">${trust.score}</span>
          `;
          trustList.appendChild(listItem);
        }
      }
      
      // Render peer list
      const peerList = this.shadowRoot.getElementById('peer-list');
      peerList.innerHTML = '';
      
      if (peers.length === 0) {
        peerList.innerHTML = '<div class="list-item"><div class="list-item-info">No peers found</div></div>';
      } else {
        for (const peer of peers) {
          const trustClass = peer.trust >= 0.7 ? 'trust-high' : peer.trust >= 0.4 ? 'trust-medium' : 'trust-low';
          const listItem = document.createElement('div');
          listItem.className = 'list-item';
          listItem.innerHTML = `
            <div class="list-item-info">
              <div class="list-item-title">${peer.id}</div>
              <div class="list-item-subtitle">${peer.url}</div>
            </div>
            <span class="trust-score ${trustClass}">${peer.trust}</span>
          `;
          peerList.appendChild(listItem);
        }
      }
    } catch (error) {
      this.showStatus(`Error loading data: ${error.message}`, 'error');
    }
  }

  showStatus(message, type) {
    const statusEl = this.shadowRoot.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.style.display = 'block';
    
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 5000);
  }
}

customElements.define('trust-panel', TrustPanel); 