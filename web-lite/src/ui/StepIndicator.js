class StepIndicator extends HTMLElement {
  static get observedAttributes() { return ['step']; }
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.step = 1;
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'step') {
      this.step = parseInt(newValue) || 1;
      this.render();
    }
  }
  connectedCallback() {
    this.render();
  }
  render() {
    const steps = [
      { label: 'Start My Digital Self', icon: '👤' },
      { label: 'Set a Goal', icon: '📝' },
      { label: 'Allow Access', icon: '🔑' },
      { label: 'Run AI Assistant', icon: '🤖' }
    ];
    this.shadowRoot.innerHTML = `
      <style>
        .steps {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          margin: 0 0 24px 0;
        }
        .step {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 1rem;
          color: #6b7280;
          font-weight: 500;
        }
        .step.active {
          color: #3b82f6;
          font-weight: 700;
        }
        .step-icon {
          font-size: 1.2em;
        }
        .arrow {
          color: #d1d5db;
          font-size: 1.2em;
        }
        @media (max-width: 600px) {
          .steps { flex-direction: column; gap: 4px; }
          .arrow { display: none; }
        }
      </style>
      <div class="steps">
        ${steps.map((s, i) => `
          <span class="step${this.step === i+1 ? ' active' : ''}">
            <span class="step-icon">${s.icon}</span> ${s.label}
          </span>
          ${i < steps.length-1 ? '<span class="arrow">→</span>' : ''}
        `).join('')}
      </div>
    `;
  }
}
customElements.define('step-indicator', StepIndicator); 