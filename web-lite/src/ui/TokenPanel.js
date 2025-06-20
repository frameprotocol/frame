import frame from '../frame.js';
import '../ui/StepIndicator.js';

class TokenPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.loadBalances();
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
          max-width: 600px;
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
        
        .balance-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-top: 16px;
        }
        
        .balance-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 16px;
          text-align: center;
        }
        
        .balance-amount {
          font-size: 24px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 4px;
        }
        
        .balance-identity {
          font-size: 12px;
          color: #6b7280;
          word-break: break-all;
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
          
          .balance-grid {
            grid-template-columns: 1fr;
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
            <h2 class="section-title">Add Credits</h2>
            <span class="info" tabindex="0">ℹ️</span>
            <div class="tooltip">Credits are tokens you can use to access features or share with others. Add credits to your digital self here.</div>
          </div>
          <form id="mint-form">
            <div class="form-group">
              <label class="form-label" for="mint-identity">Identity</label>
              <select id="mint-identity" class="form-select" required>
                <option value="">Select identity...</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="mint-amount">Amount</label>
              <input type="number" id="mint-amount" class="form-input" placeholder="100" min="1" required>
            </div>
            <button type="submit" class="btn btn-success">Add Credits</button>
          </form>
        </div>
        
        <div class="section">
          <div class="section-title-wrap">
            <h2 class="section-title">Send Credits</h2>
            <span class="info" tabindex="0">ℹ️</span>
            <div class="tooltip">Send credits to another digital self. Use this to share or pay for access.</div>
          </div>
          <form id="transfer-form">
            <div class="form-group">
              <label class="form-label" for="transfer-from">From Identity</label>
              <select id="transfer-from" class="form-select" required>
                <option value="">Select sender...</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="transfer-to">To Identity</label>
              <input type="text" id="transfer-to" class="form-input" placeholder="did:frame:bob" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="transfer-amount">Amount</label>
              <input type="number" id="transfer-amount" class="form-input" placeholder="50" min="1" required>
            </div>
            <button type="submit" class="btn btn-warning">Send Credits</button>
          </form>
        </div>
        
        <div class="section">
          <h2 class="section-title">Token Balances</h2>
          <button id="refresh-balances" class="btn btn-primary">Refresh Balances</button>
          <div id="balance-grid" class="balance-grid"></div>
        </div>
        
        <div id="status" class="status" style="display: none;"></div>
      </div>
    `;
  }

  setupEventListeners() {
    const mintForm = this.shadowRoot.getElementById('mint-form');
    const transferForm = this.shadowRoot.getElementById('transfer-form');
    const refreshBtn = this.shadowRoot.getElementById('refresh-balances');
    
    mintForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.mintTokens();
    });
    
    transferForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.transferTokens();
    });
    
    refreshBtn.addEventListener('click', () => {
      this.loadBalances();
    });
  }

  async mintTokens() {
    const identitySelect = this.shadowRoot.getElementById('mint-identity');
    const amountInput = this.shadowRoot.getElementById('mint-amount');
    
    const identity = identitySelect.value;
    const amount = parseInt(amountInput.value);
    
    if (!identity || !amount) {
      this.showStatus('Please fill in all fields', 'error');
      return;
    }
    
    try {
      const newBalance = await frame.mintTokens(identity, amount);
      amountInput.value = '';
      this.showStatus(`Minted ${amount} tokens for ${identity}. New balance: ${newBalance}`, 'success');
      await this.loadBalances();
    } catch (error) {
      this.showStatus(`Error minting tokens: ${error.message}`, 'error');
    }
  }

  async transferTokens() {
    const fromSelect = this.shadowRoot.getElementById('transfer-from');
    const toInput = this.shadowRoot.getElementById('transfer-to');
    const amountInput = this.shadowRoot.getElementById('transfer-amount');
    
    const from = fromSelect.value;
    const to = toInput.value.trim();
    const amount = parseInt(amountInput.value);
    
    if (!from || !to || !amount) {
      this.showStatus('Please fill in all fields', 'error');
      return;
    }
    
    try {
      const result = await frame.transferTokens(from, to, amount);
      toInput.value = '';
      amountInput.value = '';
      this.showStatus(`Transferred ${amount} tokens from ${from} to ${to}`, 'success');
      await this.loadBalances();
    } catch (error) {
      this.showStatus(`Error transferring tokens: ${error.message}`, 'error');
    }
  }

  async loadBalances() {
    try {
      const identities = await frame.getIdentities();
      const balanceGrid = this.shadowRoot.getElementById('balance-grid');
      const mintIdentitySelect = this.shadowRoot.getElementById('mint-identity');
      const transferFromSelect = this.shadowRoot.getElementById('transfer-from');
      
      // Update select options
      mintIdentitySelect.innerHTML = '<option value="">Select identity...</option>';
      transferFromSelect.innerHTML = '<option value="">Select sender...</option>';
      
      balanceGrid.innerHTML = '';
      
      for (const identity of identities) {
        const balance = await frame.getBalance(identity.did);
        
        // Add to select options
        const mintOption = document.createElement('option');
        mintOption.value = identity.did;
        mintOption.textContent = `${identity.name} (${identity.did})`;
        mintIdentitySelect.appendChild(mintOption);
        
        const transferOption = document.createElement('option');
        transferOption.value = identity.did;
        transferOption.textContent = `${identity.name} (${identity.did})`;
        transferFromSelect.appendChild(transferOption);
        
        // Create balance card
        const balanceCard = document.createElement('div');
        balanceCard.className = 'balance-card';
        balanceCard.innerHTML = `
          <div class="balance-amount">${balance}</div>
          <div class="balance-identity">${identity.name}</div>
          <div class="balance-identity">${identity.did}</div>
        `;
        balanceGrid.appendChild(balanceCard);
      }
      
      if (identities.length === 0) {
        balanceGrid.innerHTML = '<p style="color: #6b7280; text-align: center; padding: 20px;">No identities found. Create an identity first.</p>';
      }
    } catch (error) {
      this.showStatus(`Error loading balances: ${error.message}`, 'error');
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

customElements.define('token-panel', TokenPanel); 