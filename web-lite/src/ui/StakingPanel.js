import frame from '../frame.js';
import '../ui/StepIndicator.js';

class StakingPanel extends HTMLElement {
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
        
        .stakes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
          margin-top: 16px;
        }
        
        .stake-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          position: relative;
        }
        
        .stake-card.locked {
          border-left: 4px solid #10b981;
        }
        
        .stake-card.unlocked {
          border-left: 4px solid #f59e0b;
        }
        
        .stake-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        
        .stake-identity {
          font-weight: 600;
          color: #1f2937;
          font-size: 14px;
        }
        
        .stake-status {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .stake-status.locked {
          background: #d1fae5;
          color: #065f46;
        }
        
        .stake-status.unlocked {
          background: #fef3c7;
          color: #92400e;
        }
        
        .stake-details {
          margin-bottom: 12px;
        }
        
        .stake-detail {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          font-size: 13px;
        }
        
        .stake-detail-label {
          color: #6b7280;
        }
        
        .stake-detail-value {
          color: #1f2937;
          font-weight: 500;
        }
        
        .stake-actions {
          display: flex;
          gap: 8px;
        }
        
        .stake-amount {
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 8px;
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
        
        @media (max-width: 640px) {
          :host {
            padding: 12px;
          }
          
          .section {
            padding: 16px;
          }
          
          .stakes-grid {
            grid-template-columns: 1fr;
          }
          
          .stake-actions {
            flex-direction: column;
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
      
      <step-indicator step="3"></step-indicator>
      <div class="container">
        <div class="section">
          <div class="section-title-wrap">
            <h2 class="section-title">Secure Access</h2>
            <span class="info" tabindex="0">ℹ️</span>
            <div class="tooltip">Secure Access lets you lock tokens to enable special permissions or features. Stake tokens to unlock advanced capabilities for your digital self.</div>
          </div>
          <form id="stake-form">
            <div class="form-group">
              <label class="form-label" for="stake-identity">Identity</label>
              <select id="stake-identity" class="form-select" required>
                <option value="">Select identity...</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="stake-action">Capability Action</label>
              <input type="text" id="stake-action" class="form-input" placeholder="example.com" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="stake-amount">Token Amount</label>
              <input type="number" id="stake-amount" class="form-input" placeholder="100" min="1" required>
            </div>
            <button type="submit" class="btn btn-success">Secure Access</button>
          </form>
        </div>
        
        <div class="section">
          <h2 class="section-title">Active Stakes</h2>
          <button id="refresh-stakes" class="btn btn-primary">Refresh Stakes</button>
          <div id="stakes-grid" class="stakes-grid"></div>
        </div>
        
        <div id="status" class="status" style="display: none;"></div>
      </div>
    `;
  }

  setupEventListeners() {
    const stakeForm = this.shadowRoot.getElementById('stake-form');
    const refreshBtn = this.shadowRoot.getElementById('refresh-stakes');
    
    stakeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.stakeCapability();
    });
    
    refreshBtn.addEventListener('click', () => {
      this.loadData();
    });
  }

  async stakeCapability() {
    const identitySelect = this.shadowRoot.getElementById('stake-identity');
    const actionInput = this.shadowRoot.getElementById('stake-action');
    const amountInput = this.shadowRoot.getElementById('stake-amount');
    
    const identity = identitySelect.value;
    const action = actionInput.value.trim();
    const amount = parseInt(amountInput.value);
    
    if (!identity || !action || !amount) {
      this.showStatus('Please fill in all fields', 'error');
      return;
    }
    
    try {
      const balance = await frame.getBalance(identity);
      if (balance < amount) {
        this.showStatus(`Insufficient balance: ${balance} < ${amount}`, 'error');
        return;
      }
      
      const stake = await frame.stakeCapability(identity, action, amount);
      actionInput.value = '';
      amountInput.value = '';
      this.showStatus(`Staked ${amount} tokens for ${action} capability`, 'success');
      await this.loadData();
    } catch (error) {
      this.showStatus(`Error staking capability: ${error.message}`, 'error');
    }
  }

  async unlockStake(stakeId) {
    try {
      const [identity, action] = stakeId.split(':');
      await frame.unlockStake(identity, action);
      this.showStatus(`Unlocked stake for ${action}`, 'success');
      await this.loadData();
    } catch (error) {
      this.showStatus(`Error unlocking stake: ${error.message}`, 'error');
    }
  }

  async loadData() {
    try {
      const identities = await frame.getIdentities();
      const stakes = await frame.getStakes();
      
      // Update stake form select
      const stakeIdentitySelect = this.shadowRoot.getElementById('stake-identity');
      stakeIdentitySelect.innerHTML = '<option value="">Select identity...</option>';
      
      for (const identity of identities) {
        const option = document.createElement('option');
        option.value = identity.did;
        option.textContent = `${identity.name} (${identity.did})`;
        stakeIdentitySelect.appendChild(option);
      }
      
      // Render stakes
      const stakesGrid = this.shadowRoot.getElementById('stakes-grid');
      stakesGrid.innerHTML = '';
      
      if (stakes.length === 0) {
        stakesGrid.innerHTML = '<p style="color: #6b7280; text-align: center; padding: 20px; grid-column: 1 / -1;">No stakes found</p>';
      } else {
        for (const stake of stakes) {
          const stakeCard = document.createElement('div');
          stakeCard.className = `stake-card ${stake.unlocked ? 'unlocked' : 'locked'}`;
          
          const statusClass = stake.unlocked ? 'unlocked' : 'locked';
          const statusText = stake.unlocked ? 'Unlocked' : 'Locked';
          
          stakeCard.innerHTML = `
            <div class="stake-header">
              <div class="stake-identity">${stake.identity}</div>
              <span class="stake-status ${statusClass}">${statusText}</span>
            </div>
            <div class="stake-amount">${stake.amount} tokens</div>
            <div class="stake-details">
              <div class="stake-detail">
                <span class="stake-detail-label">Action:</span>
                <span class="stake-detail-value">${stake.action}</span>
              </div>
              <div class="stake-detail">
                <span class="stake-detail-label">Staked:</span>
                <span class="stake-detail-value">${new Date(stake.staked_at).toLocaleDateString()}</span>
              </div>
              ${stake.unlocked ? `
                <div class="stake-detail">
                  <span class="stake-detail-label">Unlocked:</span>
                  <span class="stake-detail-value">${new Date(stake.unlocked_at).toLocaleDateString()}</span>
                </div>
              ` : ''}
            </div>
            ${!stake.unlocked ? `
              <div class="stake-actions">
                <button class="btn btn-warning" onclick="this.getRootNode().host.unlockStake('${stake.id}')">
                  Unlock Stake
                </button>
              </div>
            ` : ''}
          `;
          
          stakesGrid.appendChild(stakeCard);
        }
      }
    } catch (error) {
      this.showStatus(`Error loading stakes: ${error.message}`, 'error');
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

customElements.define('staking-panel', StakingPanel); 