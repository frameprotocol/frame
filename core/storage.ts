export type KvKey = (string | number)[];
let kv: Deno.Kv | null = null;
export async function getKv(): Promise<Deno.Kv> {
  if (kv) return kv;
  if (!("openKv" in Deno)) {
    throw new Error("❌ Deno.openKv is not available. Run with: --unstable");
  }
  kv = await Deno.openKv();
  return kv;
}
export async function get(key: KvKey): Promise<any> {
  const kv = await getKv();
  const res = await kv.get(key);
  return res.value ?? null;
}
export async function set(key: KvKey, value: any): Promise<void> {
  const kv = await getKv();
  await kv.set(key, value);
}
export async function list(prefix: KvKey): Promise<Array<{ key: KvKey, value: any }>> {
  const kv = await getKv();
  const results: Array<{ key: KvKey, value: any }> = [];
  for await (const entry of kv.list({ prefix })) {
    results.push({ key: entry.key, value: entry.value });
  }
  return results;
}
export async function del(key: KvKey): Promise<void> {
  const kv = await getKv();
  await kv.delete(key);
} 