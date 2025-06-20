import frame from '../frame.js';
import '../ui/StepIndicator.js';

class IdentityPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.state = {
      identity: null,
      created: false,
      vaultUnlocked: false,
      grantOffered: false,
      grantDone: false,
      error: null
    };
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  render() {
    const { identity, created, vaultUnlocked, grantOffered, grantDone, error } = this.state;
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #1e293b 0%, #3b82f6 100%);
        }
        .onboard-container {
          background: rgba(255,255,255,0.95);
          border-radius: 24px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          padding: 48px 32px 40px 32px;
          max-width: 400px;
          width: 100%;
          text-align: center;
          margin: 32px auto;
        }
        .big-btn {
          width: 100%;
          padding: 20px 0;
          font-size: 1.3rem;
          font-weight: 700;
          border-radius: 16px;
          background: linear-gradient(90deg, #3b82f6 0%, #1e293b 100%);
          color: white;
          border: none;
          margin-top: 32px;
          margin-bottom: 8px;
          box-shadow: 0 2px 8px rgba(59,130,246,0.08);
          cursor: pointer;
          transition: background 0.2s;
        }
        .big-btn:hover {
          background: linear-gradient(90deg, #2563eb 0%, #1e293b 100%);
        }
        .headline {
          font-size: 2rem;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 16px;
        }
        .payoff {
          margin-top: 40px;
          font-size: 1.1rem;
          color: #334155;
          font-weight: 500;
        }
        .identity-created {
          font-size: 1.1rem;
          color: #059669;
          margin-bottom: 12px;
          font-weight: 600;
        }
        .vault-unlocked {
          color: #2563eb;
          font-size: 1.1rem;
          font-weight: 700;
          margin-top: 24px;
        }
        .grant-offer {
          margin-top: 18px;
          font-size: 1rem;
          color: #b91c1c;
        }
        .grant-btn {
          margin-left: 8px;
          background: #059669;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 6px 18px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
        }
        .grant-btn:hover {
          background: #047857;
        }
        .error {
          color: #b91c1c;
          margin-top: 16px;
        }
      </style>
      <div class="onboard-container">
        <div class="headline">Start My Digital Self</div>
        ${!created ? `
          <button class="big-btn" id="start-btn">Start My Digital Self</button>
        ` : `
          <div class="identity-created">✅ Identity created: <span id="did">${identity?.did || ''}</span></div>
          <div style="margin-bottom:18px;">You now exist — no password, no login, no cloud.</div>
          ${!vaultUnlocked ? `
            <button class="big-btn" id="vault-btn">🔓 Access the Vault</button>
          ` : `
            <div class="vault-unlocked">✅ Vault unlocked via your agent and identity.</div>
            <div class="payoff">You just unlocked something using pure identity.<br><br>No login. No servers. No wallets. No blockchain.<br><br>Just you and your agent — executing trust locally.</div>
          `}
          ${grantOffered && !grantDone ? `
            <div class="grant-offer">Grant yourself permission? <button class="grant-btn" id="grant-btn">Grant</button></div>
          ` : ''}
        `}
        ${error ? `<div class="error">${error}</div>` : ''}
      </div>
    `;
  }

  setupEventListeners() {
    this.shadowRoot.addEventListener('click', async (e) => {
      if (e.target.id === 'start-btn') {
        const did = await frame.createIdentity('f');
        await frame.setCurrentIdentity(did);
        // Wait for storage to update, then fetch the current identity
        let identity = null;
        for (let i = 0; i < 3; i++) {
          identity = await frame.getCurrentIdentity();
          if (identity) break;
          await new Promise(res => setTimeout(res, 100));
        }
        this.state.identity = identity;
        this.state.created = true;
        this.state.error = identity ? null : 'Identity not found after creation. Please refresh and try again.';
        this.render();
      }
      if (e.target.id === 'vault-btn') {
        this.state.error = null;
        const intentUrl = 'intent://access.vault?room=secret';
        await frame.submitIntent(intentUrl);
        const caps = await frame.getCapabilities();
        const identity = await frame.getCurrentIdentity();
        const hasCap = caps.some(cap => cap.action === 'access.vault' && (cap.audience === identity.did || cap.audience === identity.name) && !cap.revoked);
        if (!hasCap) {
          this.state.grantOffered = true;
          this.render();
        } else {
          this.state.vaultUnlocked = true;
          this.render();
        }
      }
      if (e.target.id === 'grant-btn') {
        // Always fetch the latest identity before granting
        const identity = await frame.getCurrentIdentity();
        if (!identity) {
          this.state.error = 'Identity not found. Please refresh and try again.';
          this.render();
          return;
        }
        await frame.grantCapability(identity.did, 'access.vault', identity.did);
        this.state.grantDone = true;
        this.state.grantOffered = false;
        await frame.submitIntent('intent://access.vault?room=secret');
        this.state.vaultUnlocked = true;
        this.render();
      }
    });
  }
}

customElements.define('identity-panel', IdentityPanel); 