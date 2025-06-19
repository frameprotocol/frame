import { get, set, list } from "./storage.ts";
import { getBalance } from "./token.ts";
import { resolveIntent, executeIntent } from "./intent.ts";
import { verifyCapability } from "./capabilities.ts";
import { loadIdentity } from "./identity.ts";
import { appendLog } from "./utils.ts";
interface ReflexRule {
  id: string;
  agent: string;
  condition: string;
  action: string;
  enabled: boolean;
  lastTriggered?: number;
  triggerCount: number;
  createdAt: number;
}
interface ReflexConfig {
  agent: string;
  rules: ReflexRule[];
  enabled: boolean;
}
export async function createReflexRule(
  agent: string,
  condition: string,
  action: string,
  useKv = false
): Promise<string> {
  const ruleId = `${agent}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const rule: ReflexRule = {
    id: ruleId,
    agent,
    condition,
    action,
    enabled: true,
    triggerCount: 0,
    createdAt: Date.now()
  };
  await set(["reflex", "rules", ruleId], rule);
  console.log(`🧠 Created reflex rule for ${agent}: ${condition} → ${action}`);
  await appendLog(agent, {
    action: "reflex_rule_created",
    actor: agent,
    details: { rule_id: ruleId, condition, action }
  }, useKv);
  return ruleId;
}
export async function getReflexRules(agent: string, useKv = false): Promise<ReflexRule[]> {
  const entries = await list(["reflex", "rules"]);
  return entries
    .map(entry => entry.value as ReflexRule)
    .filter(rule => rule.agent === agent && rule.enabled)
    .sort((a, b) => b.createdAt - a.createdAt);
}
export async function toggleReflexRule(ruleId: string, enabled: boolean, useKv = false): Promise<void> {
  const rule = await get(["reflex", "rules", ruleId]) as ReflexRule;
  if (!rule) {
    throw new Error(`Reflex rule not found: ${ruleId}`);
  }
  rule.enabled = enabled;
  await set(["reflex", "rules", ruleId], rule);
  console.log(`${enabled ? '✅' : '❌'} ${enabled ? 'Enabled' : 'Disabled'} reflex rule: ${ruleId}`);
}
export async function deleteReflexRule(ruleId: string, useKv = false): Promise<void> {
  const rule = await get(["reflex", "rules", ruleId]) as ReflexRule;
  if (!rule) {
    throw new Error(`Reflex rule not found: ${ruleId}`);
  }
  await set(["reflex", "rules", ruleId], null);
  console.log(`🗑️ Deleted reflex rule: ${ruleId}`);
  await appendLog(rule.agent, {
    action: "reflex_rule_deleted",
    actor: rule.agent,
    details: { rule_id: ruleId, condition: rule.condition, action: rule.action }
  }, useKv);
}
async function evaluateCondition(condition: string, agent: string, useKv = false): Promise<boolean> {
  try {
    const parts = condition.trim().split(/\s+/);
    if (parts.length !== 3) {
      console.error(`❌ Invalid condition format: ${condition}`);
      return false;
    }
    const [variable, operator, value] = parts;
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) {
      console.error(`❌ Invalid numeric value in condition: ${value}`);
      return false;
    }
    let currentValue: number;
    switch (variable.toLowerCase()) {
      case "balance":
        currentValue = await getBalance(agent, useKv);
        break;
      case "reputation":
        currentValue = await getReputation(agent, useKv);
        break;
      case "blockcount":
        const blocks = await getAllBlocks();
        currentValue = blocks.length;
        break;
      default:
        console.error(`❌ Unknown variable in condition: ${variable}`);
        return false;
    }
    switch (operator) {
      case "<":
        return currentValue < numericValue;
      case "<=":
        return currentValue <= numericValue;
      case ">":
        return currentValue > numericValue;
      case ">=":
        return currentValue >= numericValue;
      case "==":
      case "=":
        return currentValue === numericValue;
      case "!=":
        return currentValue !== numericValue;
      default:
        console.error(`❌ Unknown operator in condition: ${operator}`);
        return false;
    }
  } catch (error) {
    console.error(`❌ Error evaluating condition "${condition}":`, error);
    return false;
  }
}
async function executeReflexAction(action: string, agent: string, useKv = false): Promise<boolean> {
  try {
    const [intentAction, paramsString] = action.split('?');
    const params: Record<string, string> = {};
    if (paramsString) {
      paramsString.split('&').forEach(param => {
        const [key, value] = param.split('=');
        if (key && value) {
          params[key] = value;
        }
      });
    }
    const identity = await loadIdentity(agent, useKv);
    if (!identity) {
      console.error(`❌ Identity not found for agent: ${agent}`);
      return false;
    }
    const hasCapability = await verifyCapability(identity.did, identity.did, intentAction, useKv);
    if (!hasCapability) {
      console.error(`❌ Agent ${agent} lacks capability for reflex action: ${intentAction}`);
      return false;
    }
    console.log(`⚡ Executing reflex action: ${action}`);
    const result = await executeIntent(intentAction, params, useKv);
    console.log(`✅ Reflex action executed successfully: ${action}`);
    return true;
  } catch (error) {
    console.error(`❌ Error executing reflex action "${action}":`, error);
    return false;
  }
}
export async function checkReflexRules(agent: string, useKv = false): Promise<void> {
  try {
    const rules = await getReflexRules(agent, useKv);
    for (const rule of rules) {
      if (rule.lastTriggered && Date.now() - rule.lastTriggered < 30000) { 
        continue;
      }
      const conditionMet = await evaluateCondition(rule.condition, agent, useKv);
      if (conditionMet) {
        console.log(`🧠 Reflex rule triggered for ${agent}: ${rule.condition} → ${rule.action}`);
        const success = await executeReflexAction(rule.action, agent, useKv);
        rule.lastTriggered = Date.now();
        rule.triggerCount++;
        await set(["reflex", "rules", rule.id], rule);
        await appendLog(agent, {
          action: "reflex_triggered",
          actor: agent,
          details: {
            rule_id: rule.id,
            condition: rule.condition,
            action: rule.action,
            success,
            trigger_count: rule.triggerCount
          }
        }, useKv);
      }
    }
  } catch (error) {
    console.error(`❌ Error checking reflex rules for ${agent}:`, error);
  }
}
export async function getReflexStats(agent: string, useKv = false): Promise<{
  totalRules: number;
  enabledRules: number;
  totalTriggers: number;
  rules: ReflexRule[];
}> {
  const rules = await getReflexRules(agent, useKv);
  const totalTriggers = rules.reduce((sum, rule) => sum + rule.triggerCount, 0);
  return {
    totalRules: rules.length,
    enabledRules: rules.filter(r => r.enabled).length,
    totalTriggers,
    rules
  };
}
async function getReputation(name: string, useKv = false): Promise<number> {
  const rep = await get(["reputation", name]);
  return rep || 0;
}
async function getAllBlocks(): Promise<any[]> {
  const entries = await list(["blocks"]);
  return entries.map(entry => entry.value);
} 