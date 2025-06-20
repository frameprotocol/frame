import frame from '../frame.js';
import '../ui/StepIndicator.js';

class IntentPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          background: none;
        }
        .empty-panel {
          text-align: center;
          color: #64748b;
          font-size: 1.1rem;
          opacity: 0.7;
        }
      </style>
      <div class="empty-panel">
        <!-- Intents are handled in onboarding -->
      </div>
    `;
  }
}

customElements.define('intent-panel', IntentPanel); 