import * as storage from "./storage.ts";
function extractNameFromDid(didOrName: string): string {
  if (didOrName.startsWith('did:frame:')) {
    return didOrName.replace('did:frame:', '');
  }
  return didOrName;
}
const INITIAL_SUPPLY = 1000000; 
const MINT_AUTHORITY = "did:frame:alice"; 
export interface TokenBalance {
  identity: string;
  balance: number;
  lastUpdated: number;
}
export interface TokenTransfer {
  from: string;
  to: string;
  amount: number;
  timestamp: number;
  txHash?: string;
}
export async function mintTokens(
  identity: string, 
  amount: number, 
  minter: string = MINT_AUTHORITY,
  useKv = false
): Promise<boolean> {
  try {
    if (minter !== MINT_AUTHORITY) {
      console.error(`❌ ${minter} is not authorized to mint tokens`);
      return false;
    }
    if (amount <= 0) {
      console.error(`❌ Invalid mint amount: ${amount}`);
      return false;
    }
    const currentBalance = await getBalance(identity, useKv);
    const newBalance = currentBalance + amount;
    await storage.set(["balance", identity], {
      identity,
      balance: newBalance,
      lastUpdated: Date.now()
    });
    console.log(`🪙 Minted ${amount} FRAME tokens for ${identity}`);
    console.log(`💰 New balance: ${newBalance} FRAME`);
    await logTokenOperation({
      type: "mint",
      from: minter,
      to: identity,
      amount,
      timestamp: Date.now()
    }, useKv);
    return true;
  } catch (error) {
    console.error(`❌ Failed to mint tokens: ${error}`);
    return false;
  }
}
export async function transferTokens(
  from: string, 
  to: string, 
  amount: number,
  useKv = false
): Promise<boolean> {
  try {
    if (amount <= 0) {
      console.error(`❌ Invalid transfer amount: ${amount}`);
      return false;
    }
    if (from === to) {
      console.error(`❌ Cannot transfer tokens to self`);
      return false;
    }
    const fromBalance = await getBalance(from, useKv);
    if (fromBalance < amount) {
      console.error(`❌ Insufficient balance: ${fromBalance} < ${amount}`);
      return false;
    }
    const toBalance = await getBalance(to, useKv);
    const newFromBalance = fromBalance - amount;
    const newToBalance = toBalance + amount;
    await storage.set(["balance", from], {
      identity: from,
      balance: newFromBalance,
      lastUpdated: Date.now()
    });
    await storage.set(["balance", to], {
      identity: to,
      balance: newToBalance,
      lastUpdated: Date.now()
    });
    console.log(`💸 Transferred ${amount} FRAME tokens from ${from} to ${to}`);
    console.log(`💰 ${from} balance: ${newFromBalance} FRAME`);
    console.log(`💰 ${to} balance: ${newToBalance} FRAME`);
    await logTokenOperation({
      type: "transfer",
      from,
      to,
      amount,
      timestamp: Date.now()
    }, useKv);
    return true;
  } catch (error) {
    console.error(`❌ Failed to transfer tokens: ${error}`);
    return false;
  }
}
export async function getBalance(identity: string, useKv = false): Promise<number> {
  try {
    const balanceData = await storage.get(["balance", identity]);
    if (balanceData && typeof balanceData === 'object' && 'balance' in balanceData) {
      return balanceData.balance;
    }
    return 0;
  } catch (error) {
    console.error(`❌ Failed to get balance for ${identity}: ${error}`);
    return 0;
  }
}
export async function getAllBalances(useKv = false): Promise<TokenBalance[]> {
  try {
    const entries = await storage.list(["balance"]);
    return entries.map(entry => entry.value as TokenBalance);
  } catch (error) {
    console.error(`❌ Failed to get all balances: ${error}`);
    return [];
  }
}
export async function getTransferHistory(useKv = false): Promise<TokenTransfer[]> {
  try {
    const entries = await storage.list(["transfers"]);
    return entries.map(entry => entry.value as TokenTransfer);
  } catch (error) {
    console.error(`❌ Failed to get transfer history: ${error}`);
    return [];
  }
}
async function logTokenOperation(
  operation: {
    type: 'mint' | 'transfer';
    from: string;
    to: string;
    amount: number;
    timestamp: number;
  },
  useKv = false
): Promise<void> {
  try {
    const transferRecord: TokenTransfer = {
      from: operation.from,
      to: operation.to,
      amount: operation.amount,
      timestamp: operation.timestamp
    };
    await storage.set(["transfers", operation.timestamp.toString()], transferRecord);
    const { appendLog } = await import("./utils.ts");
    await appendLog(extractNameFromDid(operation.from), {
      action: "token_operation",
      actor: extractNameFromDid(operation.from),
      details: {
        type: operation.type,
        amount: operation.amount,
        counterparty: operation.to,
        timestamp: operation.timestamp
      }
    }, useKv);
    if (operation.from !== operation.to) {
      await appendLog(extractNameFromDid(operation.to), {
        action: "token_operation",
        actor: extractNameFromDid(operation.to),
        details: {
          type: operation.type,
          amount: operation.amount,
          counterparty: operation.from,
          timestamp: operation.timestamp
        }
      }, useKv);
    }
  } catch (error) {
    console.error(`❌ Failed to log token operation: ${error}`);
  }
}
export async function initializeTokenSystem(useKv = false): Promise<void> {
  try {
    const aliceBalance = await getBalance("did:frame:alice", useKv);
    if (aliceBalance > 0) {
      console.log(`✅ Token system already initialized`);
      return;
    }
    await mintTokens("did:frame:alice", INITIAL_SUPPLY, MINT_AUTHORITY, useKv);
    console.log(`🎉 Token system initialized with ${INITIAL_SUPPLY} FRAME tokens`);
  } catch (error) {
    console.error(`❌ Failed to initialize token system: ${error}`);
  }
} 