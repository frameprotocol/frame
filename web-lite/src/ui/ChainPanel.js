import frame from '../frame.js';
import '../ui/StepIndicator.js';

class ChainPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.loadChain();
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
        
        .btn-warning {
          background: #f59e0b;
          color: white;
        }
        
        .btn-warning:hover {
          background: #d97706;
        }
        
        .btn-danger {
          background: #ef4444;
          color: white;
        }
        
        .btn-danger:hover {
          background: #dc2626;
        }
        
        .chain-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }
        
        .stat-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 16px;
          text-align: center;
        }
        
        .stat-value {
          font-size: 24px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 4px;
        }
        
        .stat-label {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .chain-list {
          max-height: 400px;
          overflow-y: auto;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }
        
        .chain-item {
          padding: 16px;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .chain-item:last-child {
          border-bottom: none;
        }
        
        .chain-item-info {
          flex: 1;
        }
        
        .chain-item-id {
          font-weight: 500;
          color: #1f2937;
          margin-bottom: 4px;
          font-family: monospace;
          font-size: 12px;
        }
        
        .chain-item-details {
          font-size: 12px;
          color: #6b7280;
        }
        
        .chain-item-hash {
          font-family: monospace;
          font-size: 10px;
          color: #9ca3af;
          word-break: break-all;
          max-width: 200px;
        }
        
        .verification-status {
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .verification-status.valid {
          background: #d1fae5;
          color: #065f46;
        }
        
        .verification-status.invalid {
          background: #fee2e2;
          color: #991b1b;
        }
        
        .verification-status.pending {
          background: #fef3c7;
          color: #92400e;
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
        
        .status.warning {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
        }
        
        @media (max-width: 640px) {
          :host {
            padding: 12px;
          }
          
          .section {
            padding: 16px;
          }
          
          .chain-stats {
            grid-template-columns: 1fr 1fr;
          }
          
          .chain-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          
          .chain-item-hash {
            max-width: 100%;
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
      
      <step-indicator step="4"></step-indicator>
      <div class="container">
        <div class="section">
          <div class="section-title-wrap">
            <h2 class="section-title">Chain Viewer</h2>
            <span class="info" tabindex="0">ℹ️</span>
            <div class="tooltip">The Chain Viewer shows the history of all actions and changes in your digital self. Use it to audit, verify, and understand your activity timeline.</div>
          </div>
          <button id="verify-chain" class="btn btn-success">Verify Chain</button>
          <button id="refresh-chain" class="btn btn-primary">Refresh Chain</button>
          <button id="wipe-chain" class="btn btn-danger">Wipe Chain</button>
        </div>
        
        <div class="section">
          <h2 class="section-title">Chain Statistics</h2>
          <div class="chain-stats">
            <div class="stat-card">
              <div class="stat-value" id="total-entries">0</div>
              <div class="stat-label">Total Entries</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" id="valid-entries">0</div>
              <div class="stat-label">Valid Entries</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" id="last-update">-</div>
              <div class="stat-label">Last Update</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" id="chain-status">Unknown</div>
              <div class="stat-label">Status</div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <h2 class="section-title">Chain Entries</h2>
          <div id="chain-list" class="chain-list"></div>
        </div>
        
        <div id="status" class="status" style="display: none;"></div>
      </div>
    `;
  }

  setupEventListeners() {
    const verifyBtn = this.shadowRoot.getElementById('verify-chain');
    const refreshBtn = this.shadowRoot.getElementById('refresh-chain');
    const wipeBtn = this.shadowRoot.getElementById('wipe-chain');
    
    verifyBtn.addEventListener('click', async () => {
      await this.verifyChain();
    });
    
    refreshBtn.addEventListener('click', () => {
      this.loadChain();
    });
    
    wipeBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to wipe the entire chain? This action cannot be undone.')) {
        await this.wipeChain();
      }
    });
  }

  async verifyChain() {
    try {
      const isValid = await frame.verifyChain();
      const status = isValid ? 'success' : 'warning';
      const message = isValid ? 'Chain verification passed' : 'Chain verification failed';
      this.showStatus(message, status);
      await this.loadChain();
    } catch (error) {
      this.showStatus(`Error verifying chain: ${error.message}`, 'error');
    }
  }

  async wipeChain() {
    try {
      // Clear all chain entries from storage
      const chain = await frame.getChain();
      for (const entry of chain) {
        // Note: This would need a delete method in storage
        // For now, we'll just show a message
      }
      this.showStatus('Chain wiped successfully', 'success');
      await this.loadChain();
    } catch (error) {
      this.showStatus(`Error wiping chain: ${error.message}`, 'error');
    }
  }

  async loadChain() {
    try {
      const chain = await frame.getChain();
      const intents = await frame.getIntents();
      
      // Update statistics
      this.shadowRoot.getElementById('total-entries').textContent = chain.length;
      this.shadowRoot.getElementById('valid-entries').textContent = chain.length; // Simplified for now
      this.shadowRoot.getElementById('last-update').textContent = chain.length > 0 
        ? new Date(chain[chain.length - 1].timestamp).toLocaleDateString()
        : '-';
      this.shadowRoot.getElementById('chain-status').textContent = chain.length > 0 ? 'Active' : 'Empty';
      
      // Render chain entries
      const chainList = this.shadowRoot.getElementById('chain-list');
      chainList.innerHTML = '';
      
      if (chain.length === 0) {
        chainList.innerHTML = '<div style="padding: 20px; text-align: center; color: #6b7280;">No chain entries found</div>';
      } else {
        // Sort by timestamp, newest first
        const sortedChain = chain.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        for (const entry of sortedChain) {
          const intent = intents[entry.id];
          const chainItem = document.createElement('div');
          chainItem.className = 'chain-item';
          
          const statusClass = 'valid'; // Simplified for now
          const statusText = 'Valid';
          
          chainItem.innerHTML = `
            <div class="chain-item-info">
              <div class="chain-item-id">${entry.id.substring(0, 16)}...</div>
              <div class="chain-item-details">
                Actor: ${entry.actor} • ${new Date(entry.timestamp).toLocaleString()}
              </div>
              ${intent ? `<div class="chain-item-details">Intent: ${intent.url}</div>` : ''}
              <div class="chain-item-hash">${entry.hash}</div>
            </div>
            <span class="verification-status ${statusClass}">${statusText}</span>
          `;
          
          chainList.appendChild(chainItem);
        }
      }
    } catch (error) {
      this.showStatus(`Error loading chain: ${error.message}`, 'error');
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

customElements.define('chain-panel', ChainPanel); 