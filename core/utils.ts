import * as storage from "./storage.ts";
export async function readAllCaps(): Promise<any[]> {
    const dir = "data/caps";
    try {
      const entries = [];
      for await (const file of Deno.readDir(dir)) {
        const data = JSON.parse(await Deno.readTextFile(`${dir}/${file.name}`));
        entries.push(data);
      }
      return entries;
    } catch {
      return [];
    }
  }
export async function ensureDir(dir: string): Promise<void> {
  try {
    await Deno.mkdir(dir, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error;
    }
  }
}
export async function writeJson(path: string, data: any): Promise<void> {
  await Deno.writeTextFile(path, JSON.stringify(data, null, 2));
}
export async function appendLog(actor: string, entry: any, useKv = false) {
  if (useKv) {
    const key = ["log", actor];
    let log = await storage.get(key) || [];
    if (!Array.isArray(log)) log = [];
    log.push({ timestamp: new Date().toISOString(), ...entry });
    await storage.set(key, log);
  } else {
    const path = `data/logs/${actor}.log`;
    await ensureDir("data/logs");
    const line = JSON.stringify({ timestamp: new Date().toISOString(), ...entry }) + "\n";
    await Deno.writeTextFile(path, line, { append: true });
  }
}
export async function generateKeyPair(): Promise<{ 
  publicKey: string; 
  privateKey: string; 
  signPublicKey: string; 
  signPrivateKey: string; 
}> {
  const { generateP256KeyPair } = await import("./crypto.ts");
  return await generateP256KeyPair();
}
export async function sign(data: object, privateKeyJwk: string): Promise<string> {
  try {
    const { importJwk } = await import("./crypto.ts");
    const privateKey = await importJwk(JSON.parse(privateKeyJwk), ["sign"]);
    const dataToSign = { ...data };
    delete (dataToSign as any).signature;
    const dataString = JSON.stringify(dataToSign, Object.keys(dataToSign).sort());
    const dataBytes = new TextEncoder().encode(dataString);
    const signature = await crypto.subtle.sign(
      {
        name: "ECDSA",
        hash: { name: "SHA-256" },
      },
      privateKey,
      dataBytes
    );
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  } catch (error) {
    console.error("Signing failed:", error);
    throw new Error("Failed to sign data");
  }
}
export async function verify(data: object, signatureBase64: string, publicKeyJwk: string): Promise<boolean> {
  try {
    const { importJwk } = await import("./crypto.ts");
    const publicKey = await importJwk(JSON.parse(publicKeyJwk), ["verify"]);
    const signatureBytes = Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0));
    const dataToVerify = { ...data };
    delete (dataToVerify as any).signature;
    const dataString = JSON.stringify(dataToVerify, Object.keys(dataToVerify).sort());
    const dataBytes = new TextEncoder().encode(dataString);
    return await crypto.subtle.verify(
      {
        name: "ECDSA",
        hash: { name: "SHA-256" },
      },
      publicKey,
      signatureBytes,
      dataBytes
    );
  } catch (error) {
    console.error("Verification failed:", error);
    return false;
  }
}