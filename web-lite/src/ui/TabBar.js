class TabBar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.activeTab = 'identity';
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.showTab(this.activeTab);
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-top: 1px solid #e5e7eb;
          z-index: 1000;
        }
        
        .tab-container {
          display: flex;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        
        .tab-container::-webkit-scrollbar {
          display: none;
        }
        
        .tab {
          flex: 1;
          min-width: 80px;
          padding: 12px 8px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          border-bottom: 3px solid transparent;
          user-select: none;
          white-space: nowrap;
        }
        
        .tab:hover {
          background: #f9fafb;
        }
        
        .tab.active {
          border-bottom-color: #3b82f6;
          color: #3b82f6;
        }
        
        .tab-icon {
          display: block;
          font-size: 16px;
          margin-bottom: 4px;
        }
        
        .tab-label {
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        @media (max-width: 640px) {
          .tab {
            min-width: 70px;
            padding: 10px 6px;
          }
          
          .tab-icon {
            font-size: 14px;
          }
          
          .tab-label {
            font-size: 9px;
          }
        }
      </style>
      
      <div class="tab-container">
        <div class="tab" data-tab="identity">
          <span class="tab-icon">👤</span>
          <div class="tab-label">My Digital Self</div>
        </div>
        <div class="tab" data-tab="capability">
          <span class="tab-icon">🔑</span>
          <div class="tab-label">Permissions</div>
        </div>
        <div class="tab" data-tab="intent">
          <span class="tab-icon">📝</span>
          <div class="tab-label">Goals / Tasks</div>
        </div>
        <div class="tab" data-tab="agent">
          <span class="tab-icon">🤖</span>
          <div class="tab-label">AI Assistant</div>
        </div>
        <div class="tab" data-tab="token">
          <span class="tab-icon">💰</span>
          <div class="tab-label">My Credits</div>
        </div>
        <div class="tab" data-tab="trust">
          <span class="tab-icon">🤝</span>
          <div class="tab-label">Trust Graph</div>
        </div>
        <div class="tab" data-tab="staking">
          <span class="tab-icon">🔒</span>
          <div class="tab-label">Secure Access</div>
        </div>
        <div class="tab" data-tab="chain">
          <span class="tab-icon">⛓️</span>
          <div class="tab-label">Chain Viewer</div>
        </div>
        <div class="tab" data-tab="console">
          <span class="tab-icon">📊</span>
          <div class="tab-label">System Logs</div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    const tabs = this.shadowRoot.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        this.showTab(tabName);
      });
    });
  }

  showTab(tabName) {
    // Update active tab
    const tabs = this.shadowRoot.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.classList.remove('active');
      if (tab.dataset.tab === tabName) {
        tab.classList.add('active');
      }
    });

    // Hide all panels
    const panels = document.querySelectorAll('identity-panel, capability-panel, intent-panel, agent-panel, token-panel, trust-panel, staking-panel, chain-panel, console-panel');
    panels.forEach(panel => {
      panel.style.display = 'none';
    });

    // Show selected panel
    const selectedPanel = document.querySelector(`${tabName}-panel`);
    if (selectedPanel) {
      selectedPanel.style.display = 'block';
    }

    this.activeTab = tabName;
  }
}

customElements.define('tab-bar', TabBar); 