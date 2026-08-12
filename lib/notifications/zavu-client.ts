import Zavu from "@zavudev/sdk";

let client: Zavu | null = null;

export function getZavuClient() {
  if (!client) {
    const apiKey = process.env.ZAVU_API_KEY;
    if (!apiKey) {
      throw new Error("Zavu API key is not configured");
    }
    client = new Zavu({ apiKey });
  }
  return client;
}