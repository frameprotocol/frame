#!/bin/bash

# FRAME Multi-Agent Testnet Setup Script
# This script demonstrates a complete peer-to-peer agent ecosystem

set -e  # Exit on any error

echo "🚀 FRAME Multi-Agent Testnet Setup"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Deno is installed
check_deno() {
    if ! command -v deno &> /dev/null; then
        print_error "Deno is not installed. Please install Deno first: https://deno.land/"
        exit 1
    fi
    print_success "Deno is installed: $(deno --version)"
}

# Function to clean old data
clean_state() {
    print_status "Cleaning old data..."
    
    # Remove old data directory
    if [ -d "data" ]; then
        rm -rf data
        print_success "Removed old data directory"
    fi
    
    # Remove old KV database
    if [ -f "kv.sqlite3" ]; then
        rm kv.sqlite3
        print_success "Removed old KV database"
    fi
    
    print_success "Clean state ready"
}

# Function to create identities
create_identities() {
    print_status "Creating base identities..."
    
    # Create Alice (primary identity)
    deno run --allow-read --allow-write --unstable-kv frame.ts create alice --kv
    print_success "Created Alice identity"
    
    # Create Bob (door access agent)
    deno run --allow-read --allow-write --unstable-kv frame.ts create bob --kv
    print_success "Created Bob identity"
    
    # Create Carol (gas payment agent)
    deno run --allow-read --allow-write --unstable-kv frame.ts create carol --kv
    print_success "Created Carol identity"
    
    # Create Dave (system monitoring agent)
    deno run --allow-read --allow-write --unstable-kv frame.ts create dave --kv
    print_success "Created Dave identity"
}

# Function to grant capabilities
grant_capabilities() {
    print_status "Granting capabilities..."
    
    # Grant door access to Bob
    deno run --allow-read --allow-write --unstable-kv frame.ts grant access.door --to bob --kv
    print_success "Granted door access to Bob"
    
    # Grant vault access to Bob (with expiration)
    deno run --allow-read --allow-write --unstable-kv frame.ts grant access.vault --to bob --expires 2024-12-31T23:59:59Z --kv
    print_success "Granted vault access to Bob (expires 2024-12-31)"
    
    # Grant gas payment to Carol
    deno run --allow-read --allow-write --unstable-kv frame.ts grant pay.gas --to carol --kv
    print_success "Granted gas payment to Carol"
    
    # Grant system status to Dave
    deno run --allow-read --allow-write --unstable-kv frame.ts grant system.status --to dave --kv
    print_success "Granted system status to Dave"
    
    # Grant file reading to Carol
    deno run --allow-read --allow-write --unstable-kv frame.ts grant read.files --to carol --kv
    print_success "Granted file reading to Carol"
}

# Function to establish trust network
establish_trust() {
    print_status "Establishing trust network..."
    
    # Alice trusts Bob (door access)
    deno run --allow-read --allow-write --unstable-kv frame.ts trust alice --trusts bob --kv
    print_success "Alice trusts Bob"
    
    # Alice trusts Carol (gas payments)
    deno run --allow-read --allow-write --unstable-kv frame.ts trust alice --trusts carol --kv
    print_success "Alice trusts Carol"
    
    # Alice trusts Dave (system monitoring)
    deno run --allow-read --allow-write --unstable-kv frame.ts trust alice --trusts dave --kv
    print_success "Alice trusts Dave"
    
    # Bob trusts Carol
    deno run --allow-read --allow-write --unstable-kv frame.ts trust bob --trusts carol --kv
    print_success "Bob trusts Carol"
    
    # Carol trusts Dave
    deno run --allow-read --allow-write --unstable-kv frame.ts trust carol --trusts dave --kv
    print_success "Carol trusts Dave"
}

# Function to test intent execution
test_intents() {
    print_status "Testing intent execution..."
    
    # Test door access
    print_status "Testing door access intent..."
    deno run --allow-read --allow-write --unstable-kv frame.ts intent 'intent://access.door?room=42' --exec --kv
    
    # Test gas payment
    print_status "Testing gas payment intent..."
    deno run --allow-read --allow-write --unstable-kv frame.ts intent 'intent://pay.gas?amount=0.1' --exec --kv
    
    # Test system status
    print_status "Testing system status intent..."
    deno run --allow-read --allow-write --unstable-kv frame.ts intent 'intent://system.status' --exec --kv
    
    # Test file reading
    print_status "Testing file reading intent..."
    deno run --allow-read --allow-write --unstable-kv frame.ts intent 'intent://read.files?path=/etc/hosts' --exec --kv
    
    print_success "All intent tests completed"
}

# Function to show logs
show_logs() {
    print_status "Showing activity logs..."
    
    echo ""
    echo "📜 Alice's Activity Log:"
    echo "========================"
    deno run --allow-read --allow-write --unstable-kv frame.ts log alice --kv
    
    echo ""
    echo "📜 Bob's Activity Log:"
    echo "======================"
    deno run --allow-read --allow-write --unstable-kv frame.ts log bob --kv
    
    echo ""
    echo "📜 Carol's Activity Log:"
    echo "========================"
    deno run --allow-read --allow-write --unstable-kv frame.ts log carol --kv
    
    echo ""
    echo "📜 Dave's Activity Log:"
    echo "======================="
    deno run --allow-read --allow-write --unstable-kv frame.ts log dave --kv
}

# Function to show network status
show_network_status() {
    print_status "Network Status:"
    
    echo ""
    echo "🔍 Listing all capabilities:"
    deno run --allow-read --allow-write --unstable-kv frame.ts list cap --kv
    
    echo ""
    echo "🔍 Listing all trust relationships:"
    deno run --allow-read --allow-write --unstable-kv frame.ts list trust --kv
}

# Function to start agents (background)
start_agents() {
    print_status "Starting agents in background..."
    
    # Start Alice (port 7001)
    deno run --allow-read --allow-write --allow-net --unstable-kv frame.ts agent alice --kv --serve --port 7001 --peers http://localhost:7002,http://localhost:7003,http://localhost:7004 &
    ALICE_PID=$!
    print_success "Started Alice agent (PID: $ALICE_PID) on port 7001"
    
    # Start Bob (port 7002)
    deno run --allow-read --allow-write --allow-net --unstable-kv frame.ts agent bob --kv --serve --port 7002 --peers http://localhost:7001,http://localhost:7003,http://localhost:7004 &
    BOB_PID=$!
    print_success "Started Bob agent (PID: $BOB_PID) on port 7002"
    
    # Start Carol (port 7003)
    deno run --allow-read --allow-write --allow-net --unstable-kv frame.ts agent carol --kv --serve --port 7003 --peers http://localhost:7001,http://localhost:7002,http://localhost:7004 &
    CAROL_PID=$!
    print_success "Started Carol agent (PID: $CAROL_PID) on port 7003"
    
    # Start Dave (port 7004)
    deno run --allow-read --allow-write --allow-net --unstable-kv frame.ts agent dave --kv --serve --port 7004 --peers http://localhost:7001,http://localhost:7002,http://localhost:7003 &
    DAVE_PID=$!
    print_success "Started Dave agent (PID: $DAVE_PID) on port 7004"
    
    echo ""
    print_success "All agents started! Press Ctrl+C to stop all agents"
    echo "Agent PIDs: Alice=$ALICE_PID, Bob=$BOB_PID, Carol=$CAROL_PID, Dave=$DAVE_PID"
    
    # Wait for user to stop
    trap "echo ''; print_status 'Stopping agents...'; kill $ALICE_PID $BOB_PID $CAROL_PID $DAVE_PID 2>/dev/null; print_success 'All agents stopped'; exit 0" INT
    wait
}

# Function to run full testnet
run_full_testnet() {
    print_status "Running full FRAME testnet..."
    
    check_deno
    clean_state
    create_identities
    grant_capabilities
    establish_trust
    test_intents
    show_logs
    show_network_status
    
    echo ""
    print_success "FRAME testnet setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Run: ./testnet_setup.sh start-agents"
    echo "2. Run: ./testnet_setup.sh submit-intents"
    echo "3. Run: ./testnet_setup.sh show-logs"
}

# Function to submit intents to running agents
submit_intents() {
    print_status "Submitting intents to running agents..."
    
    # Submit door access intent
    deno run --allow-read --allow-write --unstable-kv frame.ts submit 'intent://access.door?room=101' --kv
    print_success "Submitted door access intent"
    
    # Submit gas payment intent
    deno run --allow-read --allow-write --unstable-kv frame.ts submit 'intent://pay.gas?amount=0.05' --kv
    print_success "Submitted gas payment intent"
    
    # Submit system status intent
    deno run --allow-read --allow-write --unstable-kv frame.ts submit 'intent://system.status' --kv
    print_success "Submitted system status intent"
    
    print_success "All intents submitted to agent network"
}

# Main script logic
case "${1:-full}" in
    "full")
        run_full_testnet
        ;;
    "clean")
        clean_state
        ;;
    "create-identities")
        create_identities
        ;;
    "grant-capabilities")
        grant_capabilities
        ;;
    "establish-trust")
        establish_trust
        ;;
    "test-intents")
        test_intents
        ;;
    "show-logs")
        show_logs
        ;;
    "show-network")
        show_network_status
        ;;
    "start-agents")
        start_agents
        ;;
    "submit-intents")
        submit_intents
        ;;
    "help"|"-h"|"--help")
        echo "FRAME Multi-Agent Testnet Setup Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  full              - Run complete testnet setup (default)"
        echo "  clean             - Clean old data"
        echo "  create-identities - Create base identities"
        echo "  grant-capabilities - Grant capabilities to agents"
        echo "  establish-trust   - Establish trust network"
        echo "  test-intents      - Test intent execution"
        echo "  show-logs         - Show activity logs"
        echo "  show-network      - Show network status"
        echo "  start-agents      - Start agents in background"
        echo "  submit-intents    - Submit intents to running agents"
        echo "  help              - Show this help"
        echo ""
        echo "Examples:"
        echo "  $0                # Run full setup"
        echo "  $0 start-agents   # Start agents only"
        echo "  $0 submit-intents # Submit intents to running agents"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Run '$0 help' for usage information"
        exit 1
        ;;
esac 