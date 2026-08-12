import { Resend } from "resend";

let client: Resend | null = null;

export function getResendClient() {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("Resend API key is not configured");
    }
    client = new Resend(apiKey);
  }
  return client;
}