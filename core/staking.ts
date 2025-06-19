import { get, set, list } from "./storage.ts";
import { getBalance, transferTokens } from "./token.ts";
import { grantCapability, revokeCapability, loadCap } from "./capabilities.ts";
import { appendLog } from "./utils.ts";
import { loadIdentity } from "./identity.ts";
interface StakedCapability {
  id: string;
  capability: string;
  grantee: string;
  issuer: string;
  stakeAmount: number;
  lockedAt: number;
  expiresAt?: number;
  isActive: boolean;
  canUnlockAt?: number;
}
interface StakingConfig {
  capability: string;
  stakeRequired: number;
  lockPeriod: number; 
  description: string;
}
export async function defineStakingConfig(
  capability: string,
  stakeRequired: number,
  lockPeriod: number,
  description: string
): Promise<void> {
  const config: StakingConfig = {
    capability,
    stakeRequired,
    lockPeriod,
    description
  };
  await set(["staking", "configs", capability], config);
  console.log(`🔒 Defined staking for ${capability}: ${stakeRequired} tokens, ${lockPeriod}ms lock`);
  await appendLog("system", {
    action: "staking_config_defined",
    actor: "system",
    details: { capability, stake_required: stakeRequired, lock_period: lockPeriod }
  });
}
export async function getStakingConfig(capability: string): Promise<StakingConfig | null> {
  return await get(["staking", "configs", capability]);
}
export async function stakeForCapability(
  issuer: string,
  grantee: string,
  capability: string,
  useKv = false
): Promise<string> {
  const config = await getStakingConfig(capability);
  if (!config) {
    throw new Error(`No staking config found for capability: ${capability}`);
  }
  const issuerBalance = await getBalance(issuer, useKv);
  if (issuerBalance < config.stakeRequired) {
    throw new Error(`Insufficient balance: ${issuerBalance} < ${config.stakeRequired}`);
  }
  const existingCap = await loadCap(capability, grantee, useKv);
  if (existingCap) {
    throw new Error(`Capability ${capability} already granted to ${grantee}`);
  }
  const stakeId = `${capability}-${grantee}-${Date.now()}`;
  const stake: StakedCapability = {
    id: stakeId,
    capability,
    grantee,
    issuer,
    stakeAmount: config.stakeRequired,
    lockedAt: Date.now(),
    expiresAt: config.lockPeriod > 0 ? Date.now() + config.lockPeriod : undefined,
    isActive: true,
    canUnlockAt: config.lockPeriod > 0 ? Date.now() + config.lockPeriod : undefined
  };
  await transferTokens(issuer, "escrow", config.stakeRequired, useKv);
  await set(["staking", "stakes", stakeId], stake);
  await grantCapability(issuer, grantee, capability, stake.expiresAt ? new Date(stake.expiresAt).toISOString() : undefined, useKv);
  console.log(`🔒 Staked ${config.stakeRequired} tokens for ${capability} → ${grantee}`);
  await appendLog(issuer, {
    action: "capability_staked",
    actor: issuer,
    details: {
      capability,
      grantee,
      stake_amount: config.stakeRequired,
      stake_id: stakeId,
      expires_at: stake.expiresAt
    }
  }, useKv);
  return stakeId;
}
export async function unlockStake(stakeId: string, useKv = false): Promise<void> {
  const stake = await get(["staking", "stakes", stakeId]) as StakedCapability;
  if (!stake) {
    throw new Error(`Stake not found: ${stakeId}`);
  }
  if (!stake.isActive) {
    throw new Error(`Stake already unlocked: ${stakeId}`);
  }
  if (stake.canUnlockAt && Date.now() < stake.canUnlockAt) {
    const remainingTime = stake.canUnlockAt - Date.now();
    throw new Error(`Stake still locked for ${Math.ceil(remainingTime / 1000)} seconds`);
  }
  const cap = await loadCap(stake.capability, stake.grantee, useKv);
  if (cap && !cap.revoked && (!cap.expires_at || new Date(cap.expires_at) > new Date())) {
    throw new Error(`Capability still active, cannot unlock stake`);
  }
  await transferTokens("escrow", stake.issuer, stake.stakeAmount, useKv);
  stake.isActive = false;
  await set(["staking", "stakes", stakeId], stake);
  console.log(`🔓 Unlocked ${stake.stakeAmount} tokens for ${stakeId}`);
  await appendLog(stake.issuer, {
    action: "stake_unlocked",
    actor: stake.issuer,
    details: {
      stake_id: stakeId,
      capability: stake.capability,
      grantee: stake.grantee,
      amount: stake.stakeAmount
    }
  }, useKv);
}
export async function burnStake(stakeId: string, reason: string, useKv = false): Promise<void> {
  const stake = await get(["staking", "stakes", stakeId]) as StakedCapability;
  if (!stake) {
    throw new Error(`Stake not found: ${stakeId}`);
  }
  if (!stake.isActive) {
    throw new Error(`Stake already processed: ${stakeId}`);
  }
  await transferTokens("escrow", "burn", stake.stakeAmount, useKv);
  stake.isActive = false;
  await set(["staking", "stakes", stakeId], stake);
  console.log(`🔥 Burned ${stake.stakeAmount} tokens for ${stakeId} (${reason})`);
  await appendLog("system", {
    action: "stake_burned",
    actor: "system",
    details: {
      stake_id: stakeId,
      capability: stake.capability,
      grantee: stake.grantee,
      issuer: stake.issuer,
      amount: stake.stakeAmount,
      reason
    }
  }, useKv);
}
export async function getUserStakes(user: string, useKv = false): Promise<StakedCapability[]> {
  const entries = await list(["staking", "stakes"]);
  return entries
    .map(entry => entry.value as StakedCapability)
    .filter(stake => (stake.issuer === user || stake.grantee === user) && stake.isActive)
    .sort((a, b) => b.lockedAt - a.lockedAt);
}
export async function getStake(stakeId: string): Promise<StakedCapability | null> {
  return await get(["staking", "stakes", stakeId]);
}
export async function getTotalStaked(user: string, useKv = false): Promise<number> {
  const stakes = await getUserStakes(user, useKv);
  return stakes
    .filter(stake => stake.issuer === user)
    .reduce((sum, stake) => sum + stake.stakeAmount, 0);
}
export async function getEscrowBalance(useKv = false): Promise<number> {
  return await getBalance("escrow", useKv);
}
export async function requiresStaking(capability: string): Promise<boolean> {
  const config = await getStakingConfig(capability);
  return config !== null;
}
export async function getStakingStats(useKv = false): Promise<{
  totalStaked: number;
  activeStakes: number;
  totalBurned: number;
  escrowBalance: number;
  stakingConfigs: StakingConfig[];
}> {
  const entries = await list(["staking", "stakes"]);
  const stakes = entries.map(entry => entry.value as StakedCapability);
  const activeStakes = stakes.filter(s => s.isActive);
  const configEntries = await list(["staking", "configs"]);
  const configs = configEntries.map(entry => entry.value as StakingConfig);
  const totalStaked = activeStakes.reduce((sum, stake) => sum + stake.stakeAmount, 0);
  const totalBurned = stakes.filter(s => !s.isActive).reduce((sum, stake) => sum + stake.stakeAmount, 0);
  const escrowBalance = await getEscrowBalance(useKv);
  return {
    totalStaked,
    activeStakes: activeStakes.length,
    totalBurned,
    escrowBalance,
    stakingConfigs: configs
  };
}
export async function processExpiredStakes(useKv = false): Promise<number> {
  const entries = await list(["staking", "stakes"]);
  const stakes = entries.map(entry => entry.value as StakedCapability);
  let unlockedCount = 0;
  for (const stake of stakes) {
    if (!stake.isActive) continue;
    if (stake.canUnlockAt && Date.now() >= stake.canUnlockAt) {
      try {
        await unlockStake(stake.id, useKv);
        unlockedCount++;
      } catch (error) {
        console.error(`Failed to unlock stake ${stake.id}:`, error);
      }
    }
  }
  if (unlockedCount > 0) {
    console.log(`🔓 Auto-unlocked ${unlockedCount} expired stakes`);
  }
  return unlockedCount;
} 