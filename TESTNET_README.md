# FRAME Multi-Agent Testnet 🚀

A complete demonstration of FRAME's peer-to-peer agent ecosystem with decentralized identity, capability delegation, intent negotiation, and encrypted messaging.

## Overview

This testnet demonstrates a fully functional multi-agent system where:

- **Alice** is the primary identity who delegates capabilities
- **Bob** handles door access and vault operations
- **Carol** manages gas payments and file operations
- **Dave** monitors system status and health

All agents communicate via encrypted peer-to-peer messaging using X25519 + AES-GCM, with capability-based security and trust networks.

## Quick Start

### Prerequisites

- [Deno](https://deno.land/) installed
- Windows, macOS, or Linux

### Option 1: Automated Setup (Recommended)

**Linux/macOS:**
```bash
./testnet_setup.sh
```

**Windows:**
```cmd
testnet_setup.bat
```

### Option 2: Manual Setup

```bash
# 1. Clean state
rm -rf data kv.sqlite3

# 2. Create identities
deno run --allow-read --allow-write --unstable-kv frame.ts create alice --kv
deno run --allow-read --allow-write --unstable-kv frame.ts create bob --kv
deno run --allow-read --allow-write --unstable-kv frame.ts create carol --kv
deno run --allow-read --allow-write --unstable-kv frame.ts create dave --kv

# 3. Grant capabilities
deno run --allow-read --allow-write --unstable-kv frame.ts grant access.door --to bob --kv
deno run --allow-read --allow-write --unstable-kv frame.ts grant access.vault --to bob --expires 2024-12-31T23:59:59Z --kv
deno run --allow-read --allow-write --unstable-kv frame.ts grant pay.gas --to carol --kv
deno run --allow-read --allow-write --unstable-kv frame.ts grant system.status --to dave --kv
deno run --allow-read --allow-write --unstable-kv frame.ts grant read.files --to carol --kv

# 4. Establish trust network
deno run --allow-read --allow-write --unstable-kv frame.ts trust alice --trusts bob --kv
deno run --allow-read --allow-write --unstable-kv frame.ts trust alice --trusts carol --kv
deno run --allow-read --allow-write --unstable-kv frame.ts trust alice --trusts dave --kv
deno run --allow-read --allow-write --unstable-kv frame.ts trust bob --trusts carol --kv
deno run --allow-read --allow-write --unstable-kv frame.ts trust carol --trusts dave --kv

# 5. Test intent execution
deno run --allow-read --allow-write --unstable-kv frame.ts intent 'intent://access.door?room=42' --exec --kv
deno run --allow-read --allow-write --unstable-kv frame.ts intent 'intent://pay.gas?amount=0.1' --exec --kv
deno run --allow-read --allow-write --unstable-kv frame.ts intent 'intent://system.status' --exec --kv
```

## Running the Multi-Agent Network

### Start All Agents

**Linux/macOS:**
```bash
./testnet_setup.sh start-agents
```

**Windows:**
```cmd
testnet_setup.bat start-agents
```

This starts 4 agents on different ports:
- **Alice**: http://localhost:7001
- **Bob**: http://localhost:7002  
- **Carol**: http://localhost:7003
- **Dave**: http://localhost:7004

### Submit Intents to Network

```bash
# Submit intents to running agents
./testnet_setup.sh submit-intents
```

Or manually:
```bash
deno run --allow-read --allow-write --unstable-kv frame.ts submit 'intent://access.door?room=101' --kv
deno run --allow-read --allow-write --unstable-kv frame.ts submit 'intent://pay.gas?amount=0.05' --kv
deno run --allow-read --allow-write --unstable-kv frame.ts submit 'intent://system.status' --kv
```

## Available Commands

### Script Commands

| Command | Description |
|---------|-------------|
| `full` | Run complete testnet setup (default) |
| `clean` | Clean old data |
| `create-identities` | Create base identities |
| `grant-capabilities` | Grant capabilities to agents |
| `establish-trust` | Establish trust network |
| `test-intents` | Test intent execution |
| `show-logs` | Show activity logs |
| `show-network` | Show network status |
| `start-agents` | Start agents in background |
| `submit-intents` | Submit intents to running agents |
| `help` | Show help |

### Examples

```bash
# Run full setup
./testnet_setup.sh

# Start agents only
./testnet_setup.sh start-agents

# Submit intents to running agents
./testnet_setup.sh submit-intents

# Show all logs
./testnet_setup.sh show-logs

# Show network status
./testnet_setup.sh show-network
```

## Agent Capabilities

### Bob (Access Control Agent)
- **access.door**: Unlock doors with room-specific access
- **access.vault**: Access secure vaults (with expiration)

### Carol (Payment & File Agent)
- **pay.gas**: Process gas payments
- **read.files**: Read files from specified paths

### Dave (System Monitor Agent)
- **system.status**: Monitor system health and status

## Intent Examples

```bash
# Door access
intent://access.door?room=42

# Gas payment
intent://pay.gas?amount=0.1

# System status
intent://system.status

# File reading
intent://read.files?path=/etc/hosts

# Vault access
intent://access.vault?vault=main
```

## Network Architecture

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  Alice  │────│   Bob   │────│  Carol  │────│   Dave  │
│ (7001)  │    │ (7002)  │    │ (7003)  │    │ (7004)  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │              │              │
     └──────────────┴──────────────┴──────────────┘
                    P2P Network
```

### Trust Relationships

```
Alice ──trusts──► Bob (door access)
Alice ──trusts──► Carol (gas payments)  
Alice ──trusts──► Dave (system monitoring)
Bob ────trusts──► Carol
Carol ──trusts──► Dave
```

## Security Features

### Cryptographic Security
- **X25519** for key exchange
- **AES-GCM** for encrypted messaging
- **ECDSA** for digital signatures
- **JWK** format for key serialization

### Capability-Based Security
- Fine-grained permissions
- Time-limited capabilities
- Delegation with constraints
- Cryptographic verification

### Trust Networks
- Reputation scoring
- Trust propagation
- Risk assessment
- Anomaly detection

## Monitoring & Logging

### View Activity Logs

```bash
# View specific agent logs
deno run --allow-read --allow-write --unstable-kv frame.ts log alice --kv
deno run --allow-read --allow-write --unstable-kv frame.ts log bob --kv
deno run --allow-read --allow-write --unstable-kv frame.ts log carol --kv
deno run --allow-read --allow-write --unstable-kv frame.ts log dave --kv

# Or use script
./testnet_setup.sh show-logs
```

### Network Status

```bash
# List all capabilities
deno run --allow-read --allow-write --unstable-kv frame.ts list cap --kv

# List trust relationships
deno run --allow-read --allow-write --unstable-kv frame.ts list trust --kv

# Or use script
./testnet_setup.sh show-network
```

## Development

### Adding New Capabilities

1. Add capability handler to `runtime/caps.ts`:
```typescript
export async function handleCustomAction(params: any) {
  console.log(`🔧 Executing custom action with params:`, params);
  return { success: true, result: "Custom action completed" };
}
```

2. Grant the capability:
```bash
deno run --allow-read --allow-write --unstable-kv frame.ts grant custom.action --to agent --kv
```

3. Execute the intent:
```bash
deno run --allow-read --allow-write --unstable-kv frame.ts intent 'intent://custom.action?param=value' --exec --kv
```

### Extending the Network

1. Create new identity:
```bash
deno run --allow-read --allow-write --unstable-kv frame.ts create newagent --kv
```

2. Start new agent:
```bash
deno run --allow-read --allow-write --allow-net --unstable-kv frame.ts agent newagent --kv --serve --port 7005 --peers http://localhost:7001,http://localhost:7002,http://localhost:7003,http://localhost:7004
```

## Troubleshooting

### Common Issues

1. **Port already in use**: Change port numbers in the script
2. **Permission denied**: Ensure Deno has necessary permissions
3. **KV database locked**: Stop all agents and restart
4. **Agent not responding**: Check if agent is running on correct port

### Debug Mode

Run with verbose logging:
```bash
deno run --allow-read --allow-write --allow-net --unstable-kv frame.ts agent alice --kv --serve --port 7001 --debug
```

### Clean Restart

```bash
# Stop all agents and clean data
./testnet_setup.sh clean
./testnet_setup.sh
```

## Next Steps

1. **Scale the network**: Add more agents and capabilities
2. **Implement persistence**: Add database backends
3. **Add web UI**: Create dashboard for monitoring
4. **Deploy to cloud**: Run agents on different machines
5. **Add consensus**: Implement distributed consensus protocols
6. **Extend cryptography**: Add zero-knowledge proofs

## License

This testnet is part of the FRAME project. See [LICENSE](LICENSE) for details. 