import { sendMessage } from "./message.ts";
export interface Proposal {
  id: string;
  from: string;
  to: string;
  intent: string;
  reason: string;
  votes: Record<string, boolean>; 
  created_at: string;
}
export async function proposeIntent(agent: string, to: string, baseIntent: string, reason: string, useKv = false) {
  const msg = {
    type: "intent_proposal",
    from: agent,
    to,
    intent: baseIntent,
    reason,
    timestamp: Date.now(),
  };
  await sendMessage(agent, to, msg.type, msg, useKv);
}
export async function voteOnIntent(agent: string, to: string, intent: string, vote: "yes" | "no", useKv = false) {
  const msg = {
    type: "intent_vote",
    from: agent,
    to,
    intent,
    vote,
    timestamp: Date.now(),
  };
  await sendMessage(agent, to, msg.type, msg, useKv);
} 