import * as storage from "./storage.ts";
export async function readAllCaps(useKv = false): Promise<any[]> {
  if (useKv) {
    console.log("🔍 Searching capabilities in KV with prefix", ["cap"]);
    const caps = await storage.list(["cap"]);
    console.log(`📦 Found ${caps.length} capabilities in KV`);
    caps.forEach((cap, i) => {
      console.log(`  ${i + 1}. ${JSON.stringify(cap.key)}: ${JSON.stringify(cap.value)}`);
    });
    return caps.map(entry => entry.value);
  } else {
    const caps: any[] = [];
    try {
      const capFiles = Deno.readDirSync("data/caps");
      for (const entry of capFiles) {
        if (entry.isFile && entry.name.endsWith('.json')) {
          const content = await Deno.readTextFile(`data/caps/${entry.name}`);
          caps.push(JSON.parse(content));
        }
      }
    } catch {
    }
    return caps;
  }
} 