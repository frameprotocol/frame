# FRAME Web Runtime

A fully sovereign, zero-dependency web runtime for the FRAME capability-based system. Built with native Web Components, ES modules, and modern web APIs.

## Features

### Core FRAME Capabilities
- **Identity Management**: Create and manage decentralized identities (DIDs)
- **Capability System**: Grant, revoke, and manage capabilities between identities
- **Intent Processing**: Submit and execute intents with capability verification
- **Autonomous Agents**: Run background agents that process intents automatically
- **Token Economy**: Mint, transfer, and manage tokens for staking and incentives
- **Trust Networks**: Establish trust relationships between identities and peers
- **Capability Staking**: Stake tokens to secure capabilities with economic incentives
- **Chain Operations**: Maintain and verify an immutable chain of operations

### Technical Features
- **Zero Dependencies**: No npm, no build steps, no external libraries
- **Native Web Components**: Custom elements with Shadow DOM
- **ES Modules**: Modern JavaScript module system
- **IndexedDB Storage**: Persistent local storage
- **Web Crypto API**: Native cryptographic operations
- **PWA Support**: Installable progressive web app
- **Offline First**: Works completely offline
- **Mobile Optimized**: Responsive design for all screen sizes

## Usage

### Quick Start

1. **Open the app**: Simply open `index.html` in any modern browser
2. **Create an identity**: Use the Identity panel to create your first DID
3. **Grant capabilities**: Use the Capability panel to grant permissions
4. **Submit intents**: Use the Intent panel to submit requests
5. **Run agents**: Use the Agent panel to start autonomous processing

### Identity Management

Create and manage decentralized identities:

```javascript
// Create a new identity
await frame.createIdentity('alice');

// List all identities
const identities = await frame.getIdentities();
```

### Capability System

Grant and manage capabilities between identities:

```javascript
// Grant a capability
await frame.grantCapability('did:frame:alice', 'did:frame:bob', 'example.com');

// List capabilities
const capabilities = await frame.getCapabilities();

// Revoke a capability
await frame.revokeCapability('example.com', 'did:frame:bob');
```

### Token Economy

Manage the token system for staking and incentives:

```javascript
// Mint tokens
await frame.mintTokens('did:frame:alice', 1000);

// Check balance
const balance = await frame.getBalance('did:frame:alice');

// Transfer tokens
await frame.transferTokens('did:frame:alice', 'did:frame:bob', 100);
```

### Trust Networks

Establish trust relationships:

```javascript
// Set trust between identities
await frame.setTrust('did:frame:alice', 'did:frame:bob', 0.8);

// Add a peer
await frame.addPeer('peer123', 'https://peer.example.com', 0.7);

// Update peer trust
await frame.updatePeerTrust('peer123', 0.9);
```

### Capability Staking

Stake tokens to secure capabilities:

```javascript
// Stake tokens for a capability
await frame.stakeCapability('did:frame:alice', 'example.com', 100);

// Unlock a stake
await frame.unlockStake('did:frame:alice', 'example.com');

// List all stakes
const stakes = await frame.getStakes();
```

### Intent Processing

Submit and execute intents:

```javascript
// Submit an intent
const intentId = await frame.submitIntent('https://example.com/api/data');

// Execute an intent immediately
await frame.submitIntent('https://example.com/api/data', true);

// List all intents
const intents = await frame.getIntents();
```

### Agent Runtime

Run autonomous agents:

```javascript
// Start an agent
await frame.startAgent('did:frame:alice');

// Check if agent is running
const isRunning = frame.isAgentRunning();

// Stop the agent
frame.stopAgent();
```

### Chain Operations

Manage the immutable chain:

```javascript
// Verify the chain
const isValid = await frame.verifyChain();

// Get chain entries
const chain = await frame.getChain();

// Add entry to chain (automatically done when submitting intents)
await frame.addToChain(intentId, 'did:frame:alice');
```

## UI Panels

The web runtime provides 9 main panels:

1. **Identity Panel**: Create and manage identities
2. **Capability Panel**: Grant, revoke, and audit capabilities
3. **Intent Panel**: Submit and monitor intents
4. **Agent Panel**: Start and manage autonomous agents
5. **Token Panel**: Mint, transfer, and view token balances
6. **Trust Panel**: Manage trust relationships and peers
7. **Staking Panel**: Stake and unlock capabilities
8. **Chain Panel**: View and verify the operation chain
9. **Console Panel**: Monitor logs and system status

## Architecture

### Core Modules

- **`frame.js`**: Main FRAME runtime with all capabilities
- **`storage.js`**: IndexedDB wrapper for persistent storage
- **`crypto.js`**: Web Crypto API wrapper for cryptographic operations

### UI Components

All UI components are native Web Components:
- `identity-panel`: Identity management interface
- `capability-panel`: Capability management interface
- `intent-panel`: Intent submission and monitoring
- `agent-panel`: Agent control interface
- `token-panel`: Token management interface
- `trust-panel`: Trust and peer management
- `staking-panel`: Capability staking interface
- `chain-panel`: Chain operations and verification
- `console-panel`: Log monitoring and system status
- `tab-bar`: Navigation between panels

### Storage Schema

The IndexedDB database contains the following stores:
- `identities`: Identity data with public/private keys
- `capabilities`: Granted capabilities with signatures
- `intents`: Submitted intents and their status
- `tokens`: Token balances for each identity
- `trusts`: Trust relationships between entities
- `peers`: Peer network information
- `stakes`: Staked capabilities and amounts
- `chain`: Immutable chain of operations
- `logs`: System logs and events

## Security Features

- **Cryptographic Signatures**: All capabilities are cryptographically signed
- **Capability Verification**: Intents are verified against granted capabilities
- **Trust Scoring**: Peer trust is managed with numerical scores
- **Staking Security**: Economic incentives for capability security
- **Chain Integrity**: Immutable chain for audit trails

## Browser Support

Requires a modern browser with support for:
- ES Modules
- Web Components
- IndexedDB
- Web Crypto API
- Service Workers (for PWA features)

## Installation

### Local Development

1. Clone the repository
2. Open `index.html` in a web browser
3. No build steps required!

### PWA Installation

1. Open the web app in a supported browser
2. Look for the install prompt or use browser menu
3. Install as a native app
4. Works offline after installation

## Development

### Adding New Features

1. Add functionality to `frame.js`
2. Add storage methods to `storage.js` if needed
3. Create UI component in `src/ui/`
4. Add to tab bar in `TabBar.js`
5. Import in `index.html`

### Testing

Use the test page for core functionality:
```bash
# Open test page
open test-crypto.html
```

### Debugging

- Check browser console for errors
- Use the Console panel for runtime logs
- Inspect IndexedDB in browser dev tools

## CLI Equivalents

The web runtime provides the same functionality as the FRAME CLI:

| CLI Command | Web Panel | Function |
|-------------|-----------|----------|
| `frame create <name>` | Identity | Create identity |
| `frame grant <action> --to <recipient>` | Capability | Grant capability |
| `frame intent <url>` | Intent | Submit intent |
| `frame agent <identity>` | Agent | Start agent |
| `frame balance <identity>` | Token | Check balance |
| `frame mint <identity> <amount>` | Token | Mint tokens |
| `frame transfer <from> <to> <amount>` | Token | Transfer tokens |
| `frame trust <from> --trusts <to>` | Trust | Set trust |
| `frame peers <list|add>` | Trust | Manage peers |
| `frame stake <define|grant|unlock>` | Staking | Manage stakes |
| `frame chain <verify|show|wipe>` | Chain | Chain operations |

## License

This project is licensed under the same terms as the main FRAME project. 