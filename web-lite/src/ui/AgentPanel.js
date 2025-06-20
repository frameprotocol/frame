import frame from '../frame.js';
import '../ui/StepIndicator.js';

class AgentPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.updateInterval = null;
  }

  connectedCallback() {
    this.render();
    try {
      this.setupEventListeners && this.setupEventListeners();
    } catch (e) {
      // Ignore errors if elements are missing
    }
    this.startStatusUpdates();
  }

  disconnectedCallback() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
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
        
        .form-select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          background: white;
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
        
        .btn-danger {
          background: #ef4444;
          color: white;
        }
        
        .btn-danger:hover {
          background: #dc2626;
        }
        
        .btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }
        
        .status-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 16px;
        }
        
        .status-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .status-row:last-child {
          margin-bottom: 0;
        }
        
        .status-label {
          font-weight: 500;
          color: #374151;
        }
        
        .status-value {
          color: #6b7280;
        }
        
        .status-indicator {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 8px;
        }
        
        .status-indicator.running {
          background: #10b981;
        }
        
        .status-indicator.stopped {
          background: #ef4444;
        }
        
        .status-indicator.unknown {
          background: #6b7280;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
          margin-top: 16px;
        }
        
        .stat-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 12px;
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
        
        .quick-reflexes {
          margin-top: 20px;
        }
        
        .quick-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #374151;
        }
        
        .reflex-buttons {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 8px;
          margin-bottom: 20px;
        }
        
        .reflex-btn {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          color: #374151;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        
        .reflex-btn:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }
        
        .reflex-btn:active {
          background: #e5e7eb;
        }
        
        .reflex-list {
          margin-top: 16px;
        }
        
        .reflex-item {
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          margin-bottom: 8px;
          background: #f9fafb;
        }
        
        .reflex-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        
        .reflex-condition {
          font-weight: 600;
          color: #1f2937;
          font-size: 14px;
        }
        
        .reflex-action {
          font-size: 12px;
          color: #6b7280;
        }
        
        .reflex-stats {
          font-size: 11px;
          color: #9ca3af;
        }
        
        @media (max-width: 640px) {
          :host {
            padding: 12px;
          }
          
          .section {
            padding: 16px;
          }
          
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
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
            <h2 class="section-title">AI Assistant</h2>
            <span class="info" tabindex="0">ℹ️</span>
            <div class="tooltip">The AI Assistant runs in the background and helps you complete your goals and tasks automatically. Start it to let your digital self work for you.</div>
          </div>
          <form id="agent-form">
            <div class="form-group">
              <label class="form-label" for="agent-identity">Choose Your Digital Self</label>
              <select id="agent-identity" class="form-select" required>
                <option value="">Select identity...</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary">Run AI Assistant</button>
            <button type="button" class="btn btn-danger" id="stop-agent">Stop Assistant</button>
          </form>
        </div>
        
        <div class="section">
          <h2 class="section-title">Agent Status</h2>
          <div id="agent-status" class="status-card">
            <div class="status-row">
              <span class="status-label">Status:</span>
              <span class="status-value">
                <span class="status-indicator unknown"></span>
                Unknown
              </span>
            </div>
            <div class="status-row">
              <span class="status-label">Identity:</span>
              <span class="status-value" id="agent-identity">None selected</span>
            </div>
            <div class="status-row">
              <span class="status-label">Peers:</span>
              <span class="status-value" id="agent-peers">0 connected</span>
            </div>
            <div class="status-row">
              <span class="status-label">Last Activity:</span>
              <span class="status-value" id="agent-last-activity">Never</span>
            </div>
          </div>
          
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value" id="agent-intents">0</div>
              <div class="stat-label">Intents</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" id="agent-reflexes">0</div>
              <div class="stat-label">Reflexes</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" id="agent-balance">0</div>
              <div class="stat-label">Balance</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" id="agent-uptime">0s</div>
              <div class="stat-label">Uptime</div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <h2 class="section-title">Reflex Rules</h2>
          <form id="reflex-form">
            <div class="form-group">
              <label class="form-label" for="reflex-condition">Condition</label>
              <input type="text" id="reflex-condition" class="form-input" placeholder="balance < 500" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="reflex-action">Action</label>
              <input type="text" id="reflex-action" class="form-input" placeholder="mint.self?amount=100" required>
            </div>
            <button type="submit" class="btn btn-primary">Create Reflex</button>
          </form>
          
          <div class="quick-reflexes">
            <h3 class="quick-title">Quick Reflexes</h3>
            <div class="reflex-buttons">
              <button class="reflex-btn" data-condition="balance < 500" data-action="mint.self?amount=100">💰 Auto-mint when low</button>
              <button class="reflex-btn" data-condition="peers.length < 3" data-action="connect.peer?url=frame.example.com">📡 Auto-connect peers</button>
              <button class="reflex-btn" data-condition="trust.score < 0.5" data-action="revoke.capability?action=read.files">🔒 Auto-revoke low trust</button>
            </div>
          </div>
          
          <div id="reflex-list" class="reflex-list"></div>
        </div>
        
        <div id="status" class="status" style="display: none;"></div>
      </div>
    `;
  }

  setupEventListeners() {
    const startBtn = this.shadowRoot.getElementById('start-agent');
    const stopBtn = this.shadowRoot.getElementById('stop-agent');
    const identitySelect = this.shadowRoot.getElementById('agent-identity');
    const reflexForm = this.shadowRoot.getElementById('reflex-form');
    
    startBtn.addEventListener('click', async () => {
      await this.startAgent();
    });
    
    stopBtn.addEventListener('click', () => {
      this.stopAgent();
    });
    
    identitySelect.addEventListener('change', (e) => {
      const selectedIdentity = e.target.value;
      if (selectedIdentity && frame.isAgentRunning()) {
        this.showStatus('Please stop the agent before changing identity', 'warning');
        identitySelect.value = frame.currentIdentity || '';
      }
    });
    
    reflexForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.createReflex();
    });
    
    // Quick reflex buttons
    const reflexButtons = this.shadowRoot.querySelectorAll('.reflex-btn');
    reflexButtons.forEach(button => {
      button.addEventListener('click', async (e) => {
        const condition = e.target.dataset.condition;
        const action = e.target.dataset.action;
        
        const conditionInput = this.shadowRoot.getElementById('reflex-condition');
        const actionInput = this.shadowRoot.getElementById('reflex-action');
        
        conditionInput.value = condition;
        actionInput.value = action;
        
        await this.createReflex();
      });
    });
  }

  async startAgent() {
    const identitySelect = this.shadowRoot.getElementById('agent-identity');
    const selectedIdentity = identitySelect.value;
    
    if (!selectedIdentity) {
      this.showStatus('Please select an identity for the agent', 'error');
      return;
    }
    
    try {
      await frame.startAgent(selectedIdentity);
      this.updateStatus();
      this.showStatus(`Agent started with identity: ${selectedIdentity}`, 'success');
    } catch (error) {
      this.showStatus(`Error starting agent: ${error.message}`, 'error');
    }
  }

  stopAgent() {
    frame.stopAgent();
    this.updateStatus();
    this.showStatus('Agent stopped', 'success');
  }

  startStatusUpdates() {
    this.updateStatus();
    this.updateInterval = setInterval(() => {
      this.updateStatus();
    }, 1000);
  }

  async updateStatus() {
    try {
      const isRunning = frame.isAgentRunning();
      const statusIndicator = this.shadowRoot.querySelector('.status-indicator');
      const statusText = this.shadowRoot.querySelector('.status-value');
      if (statusIndicator) {
        statusIndicator.className = isRunning ? 'status-indicator running' : 'status-indicator stopped';
      }
      if (statusText) {
        statusText.textContent = isRunning ? 'Running' : 'Stopped';
      }
      // Update identity
      const identityEl = this.shadowRoot.getElementById('agent-identity');
      if (identityEl) identityEl.textContent = frame.currentIdentity || 'None selected';
      // Update stats
      if (frame.currentIdentity) {
        const balance = await frame.getBalance(frame.currentIdentity);
        const intents = await frame.getIntents();
        const reflexes = await frame.getReflexes();
        const peers = await frame.getPeers();
        const balanceEl = this.shadowRoot.getElementById('agent-balance');
        const intentsEl = this.shadowRoot.getElementById('agent-intents');
        const reflexesEl = this.shadowRoot.getElementById('agent-reflexes');
        const peersEl = this.shadowRoot.getElementById('agent-peers');
        if (balanceEl) balanceEl.textContent = balance.toFixed(2);
        if (intentsEl) intentsEl.textContent = intents.length;
        if (reflexesEl) reflexesEl.textContent = reflexes.length;
        if (peersEl) peersEl.textContent = `${peers.length} connected`;
        // Update last activity
        const lastIntent = intents[intents.length - 1];
        const lastActivityEl = this.shadowRoot.getElementById('agent-last-activity');
        if (lastIntent && lastActivityEl) {
          const lastActivity = new Date(lastIntent.submitted_at).toLocaleString();
          lastActivityEl.textContent = lastActivity;
        }
      }
      // Load reflexes
      await this.loadReflexes();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }

  async loadReflexes() {
    try {
      const reflexes = await frame.getReflexes();
      const reflexList = this.shadowRoot.getElementById('reflex-list');
      
      reflexList.innerHTML = '';
      
      if (reflexes.length === 0) {
        reflexList.innerHTML = '<div style="text-align: center; color: #6b7280; padding: 20px;">No reflex rules created yet</div>';
        return;
      }
      
      for (const reflex of reflexes) {
        const reflexItem = document.createElement('div');
        reflexItem.className = 'reflex-item';
        reflexItem.innerHTML = `
          <div class="reflex-header">
            <div class="reflex-condition">${reflex.condition}</div>
            <div class="reflex-stats">${reflex.triggerCount} triggers</div>
          </div>
          <div class="reflex-action">→ ${reflex.action}</div>
        `;
        reflexList.appendChild(reflexItem);
      }
    } catch (error) {
      console.error('Error loading reflexes:', error);
    }
  }

  async loadIdentitiesForSelect() {
    try {
      const identities = await frame.getIdentities();
      const identitySelect = this.shadowRoot.getElementById('agent-identity');
      
      const currentValue = identitySelect.value;
      identitySelect.innerHTML = '<option value="">Select identity for agent...</option>';
      
      identities.forEach(identity => {
        const option = document.createElement('option');
        option.value = identity.did;
        option.textContent = `${identity.name} (${identity.did})`;
        identitySelect.appendChild(option);
      });
      
      if (currentValue) {
        identitySelect.value = currentValue;
      } else if (frame.currentIdentity) {
        identitySelect.value = frame.currentIdentity;
      }
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

  async createReflex() {
    const condition = this.shadowRoot.getElementById('reflex-condition').value;
    const action = this.shadowRoot.getElementById('reflex-action').value;
    
    if (!condition || !action) {
      this.showStatus('Please fill in both condition and action', 'error');
      return;
    }
    
    try {
      await frame.createReflex(condition, action);
      this.showStatus('Reflex created successfully', 'success');
      this.updateStatus();
    } catch (error) {
      this.showStatus(`Error creating reflex: ${error.message}`, 'error');
    }
  }
}

customElements.define('agent-panel', AgentPanel); 