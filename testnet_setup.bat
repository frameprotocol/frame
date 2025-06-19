@echo off
REM FRAME Multi-Agent Testnet Setup Script (Windows)
REM This script demonstrates a complete peer-to-peer agent ecosystem

setlocal enabledelayedexpansion

echo 🚀 FRAME Multi-Agent Testnet Setup
echo ==================================

REM Function to print colored output
:print_status
echo [INFO] %~1
goto :eof

:print_success
echo [SUCCESS] %~1
goto :eof

:print_warning
echo [WARNING] %~1
goto :eof

:print_error
echo [ERROR] %~1
goto :eof

REM Function to check if Deno is installed
:check_deno
deno --version >nul 2>&1
if errorlevel 1 (
    call :print_error "Deno is not installed. Please install Deno first: https://deno.land/"
    exit /b 1
)
for /f "tokens=*" %%i in ('deno --version') do set DENO_VERSION=%%i
call :print_success "Deno is installed: !DENO_VERSION!"
goto :eof

REM Function to clean old data
:clean_state
call :print_status "Cleaning old data..."

if exist "data" (
    rmdir /s /q data
    call :print_success "Removed old data directory"
)

if exist "kv.sqlite3" (
    del kv.sqlite3
    call :print_success "Removed old KV database"
)

call :print_success "Clean state ready"
goto :eof

REM Function to create identities
:create_identities
call :print_status "Creating base identities..."

REM Create Alice (primary identity)
deno run --allow-read --allow-write --unstable-kv frame.ts create alice --kv
call :print_success "Created Alice identity"

REM Create Bob (door access agent)
deno run --allow-read --allow-write --unstable-kv frame.ts create bob --kv
call :print_success "Created Bob identity"

REM Create Carol (gas payment agent)
deno run --allow-read --allow-write --unstable-kv frame.ts create carol --kv
call :print_success "Created Carol identity"

REM Create Dave (system monitoring agent)
deno run --allow-read --allow-write --unstable-kv frame.ts create dave --kv
call :print_success "Created Dave identity"
goto :eof

REM Function to grant capabilities
:grant_capabilities
call :print_status "Granting capabilities..."

REM Grant door access to Bob
deno run --allow-read --allow-write --unstable-kv frame.ts grant access.door --to bob --kv
call :print_success "Granted door access to Bob"

REM Grant vault access to Bob (with expiration)
deno run --allow-read --allow-write --unstable-kv frame.ts grant access.vault --to bob --expires 2024-12-31T23:59:59Z --kv
call :print_success "Granted vault access to Bob (expires 2024-12-31)"

REM Grant gas payment to Carol
deno run --allow-read --allow-write --unstable-kv frame.ts grant pay.gas --to carol --kv
call :print_success "Granted gas payment to Carol"

REM Grant system status to Dave
deno run --allow-read --allow-write --unstable-kv frame.ts grant system.status --to dave --kv
call :print_success "Granted system status to Dave"

REM Grant file reading to Carol
deno run --allow-read --allow-write --unstable-kv frame.ts grant read.files --to carol --kv
call :print_success "Granted file reading to Carol"
goto :eof

REM Function to establish trust network
:establish_trust
call :print_status "Establishing trust network..."

REM Alice trusts Bob (door access)
deno run --allow-read --allow-write --unstable-kv frame.ts trust alice --trusts bob --kv
call :print_success "Alice trusts Bob"

REM Alice trusts Carol (gas payments)
deno run --allow-read --allow-write --unstable-kv frame.ts trust alice --trusts carol --kv
call :print_success "Alice trusts Carol"

REM Alice trusts Dave (system monitoring)
deno run --allow-read --allow-write --unstable-kv frame.ts trust alice --trusts dave --kv
call :print_success "Alice trusts Dave"

REM Bob trusts Carol
deno run --allow-read --allow-write --unstable-kv frame.ts trust bob --trusts carol --kv
call :print_success "Bob trusts Carol"

REM Carol trusts Dave
deno run --allow-read --allow-write --unstable-kv frame.ts trust carol --trusts dave --kv
call :print_success "Carol trusts Dave"
goto :eof

REM Function to test intent execution
:test_intents
call :print_status "Testing intent execution..."

REM Test door access
call :print_status "Testing door access intent..."
deno run --allow-read --allow-write --unstable-kv frame.ts intent "intent://access.door?room=42" --exec --kv

REM Test gas payment
call :print_status "Testing gas payment intent..."
deno run --allow-read --allow-write --unstable-kv frame.ts intent "intent://pay.gas?amount=0.1" --exec --kv

REM Test system status
call :print_status "Testing system status intent..."
deno run --allow-read --allow-write --unstable-kv frame.ts intent "intent://system.status" --exec --kv

REM Test file reading
call :print_status "Testing file reading intent..."
deno run --allow-read --allow-write --unstable-kv frame.ts intent "intent://read.files?path=/etc/hosts" --exec --kv

call :print_success "All intent tests completed"
goto :eof

REM Function to show logs
:show_logs
call :print_status "Showing activity logs..."

echo.
echo 📜 Alice's Activity Log:
echo ========================
deno run --allow-read --allow-write --unstable-kv frame.ts log alice --kv

echo.
echo 📜 Bob's Activity Log:
echo ======================
deno run --allow-read --allow-write --unstable-kv frame.ts log bob --kv

echo.
echo 📜 Carol's Activity Log:
echo ========================
deno run --allow-read --allow-write --unstable-kv frame.ts log carol --kv

echo.
echo 📜 Dave's Activity Log:
echo =======================
deno run --allow-read --allow-write --unstable-kv frame.ts log dave --kv
goto :eof

REM Function to show network status
:show_network_status
call :print_status "Network Status:"

echo.
echo 🔍 Listing all capabilities:
deno run --allow-read --allow-write --unstable-kv frame.ts list cap --kv

echo.
echo 🔍 Listing all trust relationships:
deno run --allow-read --allow-write --unstable-kv frame.ts list trust --kv
goto :eof

REM Function to start agents (background)
:start_agents
call :print_status "Starting agents in background..."

REM Start Alice (port 7001)
start "Alice Agent" deno run --allow-read --allow-write --allow-net --unstable-kv frame.ts agent alice --kv --serve --port 7001 --peers http://localhost:7002,http://localhost:7003,http://localhost:7004
call :print_success "Started Alice agent on port 7001"

REM Start Bob (port 7002)
start "Bob Agent" deno run --allow-read --allow-write --allow-net --unstable-kv frame.ts agent bob --kv --serve --port 7002 --peers http://localhost:7001,http://localhost:7003,http://localhost:7004
call :print_success "Started Bob agent on port 7002"

REM Start Carol (port 7003)
start "Carol Agent" deno run --allow-read --allow-write --allow-net --unstable-kv frame.ts agent carol --kv --serve --port 7003 --peers http://localhost:7001,http://localhost:7002,http://localhost:7004
call :print_success "Started Carol agent on port 7003"

REM Start Dave (port 7004)
start "Dave Agent" deno run --allow-read --allow-write --allow-net --unstable-kv frame.ts agent dave --kv --serve --port 7004 --peers http://localhost:7001,http://localhost:7002,http://localhost:7003
call :print_success "Started Dave agent on port 7004"

echo.
call :print_success "All agents started in separate windows!"
echo Close the agent windows to stop them.
goto :eof

REM Function to run full testnet
:run_full_testnet
call :print_status "Running full FRAME testnet..."

call :check_deno
call :clean_state
call :create_identities
call :grant_capabilities
call :establish_trust
call :test_intents
call :show_logs
call :show_network_status

echo.
call :print_success "FRAME testnet setup complete!"
echo.
echo Next steps:
echo 1. Run: testnet_setup.bat start-agents
echo 2. Run: testnet_setup.bat submit-intents
echo 3. Run: testnet_setup.bat show-logs
goto :eof

REM Function to submit intents to running agents
:submit_intents
call :print_status "Submitting intents to running agents..."

REM Submit door access intent
deno run --allow-read --allow-write --unstable-kv frame.ts submit "intent://access.door?room=101" --kv
call :print_success "Submitted door access intent"

REM Submit gas payment intent
deno run --allow-read --allow-write --unstable-kv frame.ts submit "intent://pay.gas?amount=0.05" --kv
call :print_success "Submitted gas payment intent"

REM Submit system status intent
deno run --allow-read --allow-write --unstable-kv frame.ts submit "intent://system.status" --kv
call :print_success "Submitted system status intent"

call :print_success "All intents submitted to agent network"
goto :eof

REM Main script logic
if "%1"=="" goto :run_full_testnet
if "%1"=="full" goto :run_full_testnet
if "%1"=="clean" goto :clean_state
if "%1"=="create-identities" goto :create_identities
if "%1"=="grant-capabilities" goto :grant_capabilities
if "%1"=="establish-trust" goto :establish_trust
if "%1"=="test-intents" goto :test_intents
if "%1"=="show-logs" goto :show_logs
if "%1"=="show-network" goto :show_network_status
if "%1"=="start-agents" goto :start_agents
if "%1"=="submit-intents" goto :submit_intents
if "%1"=="help" goto :show_help
if "%1"=="-h" goto :show_help
if "%1"=="--help" goto :show_help

call :print_error "Unknown command: %1"
echo Run 'testnet_setup.bat help' for usage information
exit /b 1

:show_help
echo FRAME Multi-Agent Testnet Setup Script
echo.
echo Usage: %0 [command]
echo.
echo Commands:
echo   full              - Run complete testnet setup (default)
echo   clean             - Clean old data
echo   create-identities - Create base identities
echo   grant-capabilities - Grant capabilities to agents
echo   establish-trust   - Establish trust network
echo   test-intents      - Test intent execution
echo   show-logs         - Show activity logs
echo   show-network      - Show network status
echo   start-agents      - Start agents in background
echo   submit-intents    - Submit intents to running agents
echo   help              - Show this help
echo.
echo Examples:
echo   %0                # Run full setup
echo   %0 start-agents   # Start agents only
echo   %0 submit-intents # Submit intents to running agents
goto :eof 