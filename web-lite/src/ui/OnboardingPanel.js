class OnboardingPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 32px 16px 100px 16px;
          background: #f8fafc;
          min-height: 100vh;
        }
        .container {
          max-width: 480px;
          margin: 0 auto;
          background: white;
          border-radius: 16px;
          box-shadow: 0 2px 16px rgba(0,0,0,0.06);
          padding: 32px 24px;
          text-align: center;
        }
        .logo {
          font-size: 48px;
          margin-bottom: 12px;
        }
        .title {
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 8px;
        }
        .desc {
          color: #374151;
          font-size: 1.1rem;
          margin-bottom: 24px;
        }
        .steps {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 32px;
        }
        .step {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1rem;
          color: #374151;
        }
        .step-num {
          background: #3b82f6;
          color: white;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.1rem;
        }
        .actions {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .btn {
          padding: 12px 0;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          background: #3b82f6;
          color: white;
          transition: background 0.2s;
        }
        .btn:hover {
          background: #2563eb;
        }
        .link-btn {
          background: none;
          color: #3b82f6;
          text-decoration: underline;
          font-weight: 500;
          cursor: pointer;
          border: none;
          font-size: 1rem;
        }
        .modal {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }
        .modal-content {
          background: white;
          border-radius: 12px;
          padding: 32px 24px;
          max-width: 400px;
          text-align: left;
        }
        .modal-content h2 {
          margin-top: 0;
        }
        .close-modal {
          position: absolute;
          top: 16px;
          right: 24px;
          font-size: 1.5rem;
          color: #6b7280;
          background: none;
          border: none;
          cursor: pointer;
        }
      </style>
      <div class="container">
        <div class="logo">🔲</div>
        <div class="title">Welcome to FRAME</div>
        <div class="desc">FRAME is your personal, private digital assistant. It helps you set goals, control access, and automate tasks — all on your device, with no cloud required.</div>
        <div class="steps">
          <div class="step"><span class="step-num">1</span> Start My Digital Self</div>
          <div class="step"><span class="step-num">2</span> Set a Goal</div>
          <div class="step"><span class="step-num">3</span> Allow Access</div>
          <div class="step"><span class="step-num">4</span> Run AI Assistant</div>
        </div>
        <div class="actions">
          <button class="btn" id="get-started">Get Started</button>
          <button class="link-btn" id="what-is-frame">What is FRAME?</button>
        </div>
      </div>
      <div id="modal" class="modal" style="display:none;">
        <div class="modal-content">
          <button class="close-modal" id="close-modal">×</button>
          <h2>What is FRAME?</h2>
          <p>FRAME is a privacy-first digital assistant that runs entirely on your device. You create your own digital identity, set goals (like "remind me to drink water"), grant permissions for what the assistant can do, and then let it work for you — all without sharing your data with anyone else.</p>
          <ul>
            <li><b>Private:</b> No cloud, no tracking, all local.</li>
            <li><b>Capable:</b> Automate tasks, manage access, and more.</li>
            <li><b>Simple:</b> Just follow the steps to get started.</li>
          </ul>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    this.shadowRoot.getElementById('get-started').onclick = () => {
      this.dispatchEvent(new CustomEvent('onboarding-complete', { bubbles: true, composed: true }));
    };
    this.shadowRoot.getElementById('what-is-frame').onclick = () => {
      this.shadowRoot.getElementById('modal').style.display = 'flex';
    };
    this.shadowRoot.getElementById('close-modal').onclick = () => {
      this.shadowRoot.getElementById('modal').style.display = 'none';
    };
  }
}

customElements.define('onboarding-panel', OnboardingPanel); 