import frame from '../frame.js';
import '../ui/StepIndicator.js';

class CapabilityPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.loadCapabilities();
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
        }
        
        .btn-primary {
          background: #3b82f6;
          color: white;
        }
        
        .btn-primary:hover {
          background: #2563eb;
        }
        
        .btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }
        
        .capability-list {
          margin-top: 16px;
        }
        
        .capability-item {
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          margin-bottom: 8px;
          background: #f9fafb;
        }
        
        .capability-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        
        .capability-action {
          font-weight: 600;
          color: #1f2937;
          font-size: 14px;
        }
        
        .capability-status {
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: 500;
        }
        
        .capability-status.valid {
          background: #d1fae5;
          color: #065f46;
        }
        
        .capability-status.expired {
          background: #fee2e2;
          color: #991b1b;
        }
        
        .capability-details {
          font-size: 12px;
          color: #6b7280;
        }
        
        .capability-details div {
          margin-bottom: 2px;
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
            <h2 class="section-title">Allow Access</h2>
            <span class="info" tabindex="0">ℹ️</span>
            <div class="tooltip">Permissions let you grant access to your digital assistant or others to perform specific actions on your behalf. Use this to control what your AI or trusted contacts can do.</div>
          </div>
          <form id="grant-form">
            <div class="form-group">
              <label class="form-label" for="issuer-select">From Identity</label>
              <select id="issuer-select" class="form-select" required>
                <option value="">Select issuer...</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="recipient-select">To Identity</label>
              <select id="recipient-select" class="form-select" required>
                <option value="">Select recipient...</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="action-input">Permission (Action)</label>
              <input type="text" id="action-input" class="form-input" placeholder="e.g., example.com" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="expires-input">Expires At (optional)</label>
              <input type="date" id="expires-input" class="form-input">
            </div>
            <button type="submit" class="btn btn-primary">Allow Access</button>
          </form>
        </div>
        
        <div class="section">
          <h2 class="section-title">All Capabilities</h2>
          <div id="capability-list" class="capability-list"></div>
        </div>
        
        <div id="status" class="status" style="display: none;"></div>
      </div>
    `;
  }

  setupEventListeners() {
    const grantForm = this.shadowRoot.getElementById('grant-form');
    
    grantForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.grantCapability();
    });
  }

  async grantCapability() {
    const issuerSelect = this.shadowRoot.getElementById('issuer-select');
    const recipientSelect = this.shadowRoot.getElementById('recipient-select');
    const actionInput = this.shadowRoot.getElementById('action-input');
    const expiresInput = this.shadowRoot.getElementById('expires-input');
    
    const issuer = issuerSelect.value;
    const recipient = recipientSelect.value;
    const action = actionInput.value.trim();
    const expiresAt = expiresInput.value ? new Date(expiresInput.value).toISOString() : null;
    
    if (!issuer || !recipient || !action) {
      this.showStatus('Please fill in all required fields', 'error');
      return;
    }
    
    try {
      await frame.grantCapability(issuer, recipient, action, expiresAt);
      
      actionInput.value = '';
      recipientSelect.value = '';
      expiresInput.value = '';
      
      this.showStatus(`Granted capability: ${action} → ${recipient}`, 'success');
      await this.loadCapabilities();
    } catch (error) {
      this.showStatus(`Error granting capability: ${error.message}`, 'error');
    }
  }

  async loadCapabilities() {
    try {
      const capabilities = await frame.getCapabilities();
      const capabilityList = this.shadowRoot.getElementById('capability-list');
      const issuerSelect = this.shadowRoot.getElementById('issuer-select');
      
      capabilityList.innerHTML = '';
      
      if (capabilities.length === 0) {
        capabilityList.innerHTML = '<p style="color: #6b7280; text-align: center; padding: 20px;">No capabilities found</p>';
      } else {
        capabilities.forEach(cap => {
          const isExpired = cap.expires_at && new Date(cap.expires_at) < new Date();
          const statusClass = isExpired ? 'expired' : 'valid';
          const statusText = isExpired ? 'Expired' : 'Valid';
          
          const listItem = document.createElement('div');
          listItem.className = 'capability-item';
          listItem.innerHTML = `
            <div class="capability-header">
              <div class="capability-action">${cap.action}</div>
              <span class="capability-status ${statusClass}">${statusText}</span>
            </div>
            <div class="capability-details">
              <div><strong>Issuer:</strong> ${cap.issuer}</div>
              <div><strong>Audience:</strong> ${cap.audience}</div>
              <div><strong>Issued:</strong> ${new Date(cap.issued_at).toLocaleString()}</div>
              ${cap.expires_at ? `<div><strong>Expires:</strong> ${new Date(cap.expires_at).toLocaleString()}</div>` : ''}
            </div>
          `;
          capabilityList.appendChild(listItem);
        });
      }
      
      await this.loadIdentitiesForSelect();
    } catch (error) {
      this.showStatus(`Error loading capabilities: ${error.message}`, 'error');
    }
  }

  async loadIdentitiesForSelect() {
    try {
      const identities = await frame.getIdentities();
      const issuerSelect = this.shadowRoot.getElementById('issuer-select');
      const recipientSelect = this.shadowRoot.getElementById('recipient-select');
      
      issuerSelect.innerHTML = '<option value="">Select issuer...</option>';
      recipientSelect.innerHTML = '<option value="">Select recipient...</option>';
      identities.forEach(identity => {
        const option = document.createElement('option');
        option.value = identity.did;
        option.textContent = `${identity.name} (${identity.did})`;
        issuerSelect.appendChild(option);
        recipientSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading identities for select:', error);
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

customElements.define('capability-panel', CapabilityPanel); 