# FRAME - Sovereign Programmable Economy Blockchain OS

FRAME is a sovereign blockchain operating system for building agent-driven, intent-based, and capability-secure decentralized applications. It features autonomous agents, cryptographically enforced capabilities, real-time peer synchronization, and a powerful reflex/rule engine.

---

## 🚀 Overview

FRAME enables:
- **Self-sovereign identities** with cryptographic proof
- **Capability-based security** (UCAN-like grants, staking, revocation)
- **Intent-driven automation** (agents resolve and execute intents)
- **Autonomous agents** with programmable reflex rules
- **Trust-based peer-to-peer networking** and encrypted messaging
- **Local-first, Deno-powered architecture** (works offline, persistent state)

---

## 🎯 Mission

**Build a world where software agents can discover, negotiate, and collaborate autonomously while preserving user sovereignty.**

FRAME enables:
- **Self-sovereign identities** with cryptographic proof
- **Capability-based security** via UCAN-like grants
- **Intent-driven automation** through agent negotiation
- **Encrypted peer-to-peer messaging** with X25519 + AES-GCM
- **Local-first architecture** that works offline

## 🚀 Features

### Core Blockchain
- **Hash-linked blockchain** with cryptographically signed blocks
- **Intent-based execution** with capability verification
- **Real-time WebSocket explorer** with live updates
- **Deno KV storage** for persistent state
- **Ed25519/ECDSA cryptography** for secure operations

### Autonomous Agents
- **Chain listeners** that auto-execute intents addressed to them
- **Reflex/rule engine** for conditional automation
- **Trust-based execution** with reputation scoring
- **Peer-to-peer gossip** for decentralized communication
- **Encrypted messaging** between agents

### Advanced Capabilities
- **Capability staking** for high-risk operations
- **Trust-based peer discovery** with scoring
- **Real-time chain verification** and validation
- **Autonomous intent resolution** and execution

## 🛠️ Installation

```bash
# Clone the repository
git clone <repository-url>
cd frame

# Install Deno (if not already installed)
curl -fsSL https://deno.land/install.sh | sh

# Run with Deno KV storage (recommended)
deno run --allow-read --allow-write --allow-net --unstable-kv frame.ts <command>
```

## 📖 CLI Command Reference

All commands support the optional `--kv` flag for persistent Deno KV storage.

### Identity & Trust

| Command | Description |
|---------|-------------|
| `frame create <name> [--kv]` | Create a new identity |
| `frame fork <parent> <child> [--kv]` | Fork an identity |
| `frame merge <from> into <target> [--kv]` | Merge identities |
| `frame trust <from> --trusts <to> [--kv]` | Set trust relationship |
| `frame claim @<handle> --as <identity> [--kv]` | Claim a handle |
| `frame whois @<handle> [--kv]` | Lookup handle owner |

### Capabilities

| Command | Description |
|---------|-------------|
| `frame grant <action> --to <recipient> [--expires <ISODate>] [--kv]` | Grant a capability |
| `frame revoke <action> --from <identity> [--kv]` | Revoke a capability |
| `frame cap list [--kv]` | List all capabilities |
| `frame cap audit [--kv]` | Audit capabilities (valid/expired/revoked) |
| `frame cap purge-invalid [--kv]` | Remove invalid capabilities |

### Tokens

| Command | Description |
|---------|-------------|
| `frame mint <identity> <amount> [--kv]` | Mint tokens |
| `frame transfer <from> <to> <amount> [--kv]` | Transfer tokens |
| `frame balance <identity> [--kv]` | Check token balance |

### Intents

| Command | Description |
|---------|-------------|
| `frame intent <intent-url> [--exec] [--anchor] [--kv]` | Resolve or execute an intent |
| `frame submit <intent-url> [--kv]` | Submit an intent for agent processing |

### Agents & Reflex

| Command | Description |
|---------|-------------|
| `frame agent <identity> [--kv] [--peers <url1,url2>] [--serve] [--port <port>]` | Start an autonomous agent |
| `frame reflex add <agent> <condition> <action> [--kv]` | Add a reflex rule |
| `frame reflex list <agent> [--kv]` | List reflex rules for an agent |
| `frame reflex stats <agent> [--kv]` | Show reflex rule stats |
| `frame reflex check <agent> [--kv]` | Manually check and trigger reflex rules |

### Staking

| Command | Description |
|---------|-------------|
| `frame stake define <capability> <amount> <lockPeriodMs> <description> [--kv]` | Define staking requirements for a capability |
| `frame stake grant <issuer> <grantee> <capability> [--kv]` | Stake tokens for a capability |
| `frame stake unlock <stakeId> [--kv]` | Unlock a stake |
| `frame stake list <user> [--kv]` | List all stakes for a user |
| `frame stake stats [--kv]` | Show staking statistics |

### Peer & Trust System

| Command | Description |
|---------|-------------|
| `frame peers list [--kv]` | List known peers |
| `frame peers add <url> <trustScore> [--kv]` | Add a peer with trust score |
| `frame trust-peer <peer-url> <score> [--kv]` | Update trust score for a peer |
| `frame peer-stats [--kv]` | Show peer statistics |

### Blockchain & Explorer

| Command | Description |
|---------|-------------|
| `frame chain verify [--kv]` | Verify hashchain integrity |
| `frame chain show [--kv]` | Show all blocks in the chain |
| `frame chain wipe [--kv]` | Wipe the blockchain |
| `frame explorer [port] [--kv]` | Start the web explorer (default port 8080) |

### Repair & Audit

| Command | Description |
|---------|-------------|
| `frame repair-identities [--kv]` | Repair identity data |
| `frame repair-caps [--kv]` | Repair capability data |

---

## 💡 Example Usage

### Create Identities

```bash
frame create alice --kv
frame create bob --kv
```

### Grant and List Capabilities

```bash
frame grant mint.frame --to bob --kv
frame cap list --kv
```

### Mint and Transfer Tokens

```bash
frame mint alice 100 --kv
frame transfer alice bob 50 --kv
frame balance alice --kv
```

### Start an Agent

```bash
frame agent alice --kv --peers http://localhost:7002 --serve --port 7001
```

### Submit and Execute Intents

```bash
frame intent "intent://mint.frame?identity=alice&amount=100" --exec --kv
frame submit "intent://transfer.frame?from=alice&to=bob&amount=25" --kv
```

### Reflex Rules

```bash
frame reflex add alice "balance < 50" "mint.self?amount=100" --kv
frame reflex list alice --kv
frame reflex check alice --kv
```

### Staking

```bash
frame stake define mint.frame 100 86400000 "Minting capability" --kv
frame stake grant alice bob mint.frame --kv
frame stake stats --kv
```

### Peer Management & Trust

```bash
frame peers add http://localhost:8080 0.8 --kv
frame trust-peer http://localhost:8080 0.9 --kv
frame peers list --kv
frame peer-stats --kv
```

### Blockchain Explorer

```bash
frame explorer 8080 --kv
# Open http://localhost:8080 in your browser
```

### Repair Commands

```bash
frame repair-identities --kv
frame repair-caps --kv
```

---

## 🧠 FRAME Concepts

### Capabilities

- **Capabilities** are cryptographically signed grants that allow an agent to perform specific actions (e.g., `mint.frame`, `access.door`).
- Capabilities can be delegated, revoked, time-limited, and staked.
- Use `frame cap list` and `frame cap audit` to inspect all capabilities.

### Intents

- **Intents** are structured requests for actions, e.g., `intent://mint.frame?identity=alice&amount=100`.
- Agents resolve and execute intents if they have the required capabilities.
- Intents can be submitted for autonomous agent processing.

### Agents

- **Agents** are autonomous processes that monitor the chain, resolve intents, and execute actions based on their capabilities and reflex rules.
- Agents can be started with peer discovery and serve HTTP/WebSocket endpoints for communication.

### Reflex Rules

- **Reflex** is a rule engine for agents to automate actions based on conditions (e.g., auto-mint when balance is low).
- Use `frame reflex add`, `frame reflex list`, `frame reflex stats`, and `frame reflex check`.

### Staking

- **Staking** is required for high-risk capabilities. Tokens are locked as escrow and can be burned for violations.
- Use `frame stake define`, `frame stake grant`, `frame stake unlock`, and `frame stake stats`.

### Peer Trust System

- **Peers** are other FRAME nodes/agents. Trust scores (0.0–1.0) affect intent routing and collaboration.
- Use `frame peers add`, `frame trust-peer`, `frame peers list`, and `frame peer-stats`.

---

## ⚙️ Optional Flags

- `--kv` : Use Deno KV for persistent storage (recommended)
- `--serve` : Start agent HTTP/WebSocket server
- `--port <port>` : Specify port for agent or explorer
- `--peers <url1,url2>` : Specify peer URLs for agent discovery
- `--exec` : Execute the intent (not just resolve)
- `--anchor` : Anchor the intent with a proof

---

## 📝 License

Commercial License - see [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md)

## 🎯 Roadmap

- [ ] **Advanced Reflex Engine** - Complex rule chaining
- [ ] **Cross-chain Bridges** - Interoperability with other blockchains
- [ ] **Smart Contracts** - Programmable capabilities
- [ ] **Governance System** - Decentralized decision making
- [ ] **Privacy Features** - Zero-knowledge proofs
- [ ] **Mobile SDK** - iOS/Android integration

---

**FRAME** - Building the sovereign programmable economy of the future.