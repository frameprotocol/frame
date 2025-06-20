import frame from '../frame.js';
import '../ui/StepIndicator.js';

class ConsolePanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.logs = [];
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.loadLogs();
    this.setupLogListener();
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
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .console-controls {
          display: flex;
          gap: 8px;
        }
        
        .btn {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-secondary {
          background: #6b7280;
          color: white;
        }
        
        .btn-secondary:hover {
          background: #4b5563;
        }
        
        .btn-danger {
          background: #ef4444;
          color: white;
        }
        
        .btn-danger:hover {
          background: #dc2626;
        }
        
        .console-output {
          background: #1f2937;
          color: #f9fafb;
          border-radius: 6px;
          padding: 16px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 13px;
          line-height: 1.5;
          max-height: 500px;
          overflow-y: auto;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        
        .log-entry {
          margin-bottom: 4px;
          padding: 2px 0;
        }
        
        .log-timestamp {
          color: #9ca3af;
          font-size: 11px;
        }
        
        .log-message {
          margin-left: 8px;
        }
        
        .log-message.info {
          color: #d1d5db;
        }
        
        .log-message.success {
          color: #10b981;
        }
        
        .log-message.error {
          color: #ef4444;
        }
        
        .log-message.warning {
          color: #f59e0b;
        }
        
        .log-entry:hover {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 2px;
        }
        
        .auto-scroll {
          position: sticky;
          bottom: 0;
          background: #1f2937;
          padding: 8px 0;
          border-top: 1px solid #374151;
          font-size: 11px;
          color: #9ca3af;
          text-align: center;
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
        
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 12px;
          margin-top: 16px;
        }
        
        .stat-item {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          padding: 8px;
          text-align: center;
        }
        
        .stat-value {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }
        
        .stat-label {
          font-size: 10px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        @media (max-width: 640px) {
          :host {
            padding: 12px;
          }
          
          .section {
            padding: 16px;
          }
          
          .console-output {
            font-size: 12px;
            max-height: 400px;
          }
          
          .stats {
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
        
        .agent-status {
          margin-bottom: 20px;
        }
        
        .status-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
        }
        
        .status-item {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 12px;
          text-align: center;
        }
        
        .status-label {
          font-size: 11px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        
        .status-value {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }
      </style>
      
      <step-indicator step="4"></step-indicator>
      <div class="container">
        <div class="section">
          <h2 class="section-title">
            Agent Status Console
            <div class="console-controls">
              <button class="btn btn-secondary" id="clear-logs">Clear</button>
              <button class="btn btn-secondary" id="export-logs">Export</button>
            </div>
          </h2>
          
          <div class="agent-status">
            <div class="status-grid">
              <div class="status-item">
                <div class="status-label">Active Agent</div>
                <div class="status-value" id="active-agent">None</div>
              </div>
              <div class="status-item">
                <div class="status-label">Peers Connected</div>
                <div class="status-value" id="peers-connected">0</div>
              </div>
              <div class="status-item">
                <div class="status-label">Last Intent</div>
                <div class="status-value" id="last-intent">None</div>
              </div>
              <div class="status-item">
                <div class="status-label">Balance</div>
                <div class="status-value" id="agent-balance">0.00</div>
              </div>
            </div>
          </div>
          
          <div class="console-output" id="console-output">
            <div class="auto-scroll">Auto-scroll enabled</div>
          </div>
        </div>
        
        <div class="section">
          <h3 class="section-title">Log Statistics</h3>
          <div class="stats">
            <div class="stat-item">
              <div id="total-logs" class="stat-value">0</div>
              <div class="stat-label">Total</div>
            </div>
            <div class="stat-item">
              <div id="info-logs" class="stat-value">0</div>
              <div class="stat-label">Info</div>
            </div>
            <div class="stat-item">
              <div id="success-logs" class="stat-value">0</div>
              <div class="stat-label">Success</div>
            </div>
            <div class="stat-item">
              <div id="error-logs" class="stat-value">0</div>
              <div class="stat-label">Errors</div>
            </div>
          </div>
        </div>
        
        <div id="status" class="status" style="display: none;"></div>
      </div>
    `;
  }

  setupEventListeners() {
    const clearBtn = this.shadowRoot.getElementById('clear-logs');
    const exportBtn = this.shadowRoot.getElementById('export-logs');
    
    clearBtn.addEventListener('click', () => {
      this.clearLogs();
    });
    
    exportBtn.addEventListener('click', () => {
      this.exportLogs();
    });
  }

  setupLogListener() {
    frame.onLog((logEntry) => {
      this.addLogEntry(logEntry);
    });
  }

  async loadLogs() {
    try {
      const logs = await frame.getLogs();
      this.logs = logs;
      this.renderLogs();
      this.updateAgentStatus();
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  }

  async updateAgentStatus() {
    try {
      // Update active agent
      const activeAgentEl = this.shadowRoot.getElementById('active-agent');
      activeAgentEl.textContent = frame.currentIdentity || 'None';
      
      // Update peers
      const peers = await frame.getPeers();
      const peersEl = this.shadowRoot.getElementById('peers-connected');
      peersEl.textContent = peers.length;
      
      // Update last intent
      const intents = await frame.getIntents();
      const lastIntentEl = this.shadowRoot.getElementById('last-intent');
      if (intents.length > 0) {
        const lastIntent = intents[intents.length - 1];
        lastIntentEl.textContent = lastIntent.url.substring(0, 30) + '...';
      } else {
        lastIntentEl.textContent = 'None';
      }
      
      // Update balance
      if (frame.currentIdentity) {
        const balance = await frame.getBalance(frame.currentIdentity);
        const balanceEl = this.shadowRoot.getElementById('agent-balance');
        balanceEl.textContent = balance.toFixed(2);
      }
    } catch (error) {
      console.error('Error updating agent status:', error);
    }
  }

  addLogEntry(logEntry) {
    this.logs.push(logEntry);
    this.renderLogs();
    this.updateStats();
    this.scrollToBottom();
  }

  renderLogs() {
    const consoleOutput = this.shadowRoot.getElementById('console-output');
    
    if (this.logs.length === 0) {
      consoleOutput.innerHTML = `
        <div class="log-entry">
          <span class="log-timestamp">[${new Date().toLocaleTimeString()}]</span>
          <span class="log-message info">No logs available.</span>
        </div>
      `;
      return;
    }
    
    consoleOutput.innerHTML = this.logs.map(log => `
      <div class="log-entry">
        <span class="log-timestamp">[${log.timestamp}]</span>
        <span class="log-message ${log.type || 'info'}">${log.message}</span>
      </div>
    `).join('');
  }

  updateStats() {
    const totalLogs = this.logs.length;
    const infoLogs = this.logs.filter(log => log.type === 'info').length;
    const successLogs = this.logs.filter(log => log.type === 'success').length;
    const errorLogs = this.logs.filter(log => log.type === 'error').length;
    
    this.shadowRoot.getElementById('total-logs').textContent = totalLogs;
    this.shadowRoot.getElementById('info-logs').textContent = infoLogs;
    this.shadowRoot.getElementById('success-logs').textContent = successLogs;
    this.shadowRoot.getElementById('error-logs').textContent = errorLogs;
  }

  scrollToBottom() {
    const consoleOutput = this.shadowRoot.getElementById('console-output');
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  }

  async clearLogs() {
    try {
      await frame.clearLogs();
      this.logs = [];
      this.renderLogs();
      this.updateStats();
      this.showStatus('Logs cleared', 'success');
    } catch (error) {
      this.showStatus(`Error clearing logs: ${error.message}`, 'error');
    }
  }

  exportLogs() {
    const logText = this.logs.map(log => 
      `[${log.timestamp}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `frame-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showStatus('Logs exported successfully', 'success');
  }

  showStatus(message, type) {
    const statusEl = this.shadowRoot.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.style.display = 'block';
    
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 3000);
  }
}

customElements.define('console-panel', ConsolePanel); 