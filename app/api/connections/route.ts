import { env } from "cloudflare:workers";
import { chatGPTSignInPath, getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required", signIn: chatGPTSignInPath("/connections") }, { status: 401 });

  return Response.json({
    checkedAt: new Date().toISOString(),
    connections: {
      account: { ready: true, note: "Signed-in private workspace" },
      database: { ready: Boolean(env.DB), note: env.DB ? "Saved plans are available" : "Database binding is unavailable" },
      files: { ready: Boolean(env.ASSETS), note: env.ASSETS ? "Private source uploads are available" : "File storage binding is unavailable" },
      weather: { ready: true, note: "Live Open-Meteo lookup is built in" },
      maps: { ready: true, note: "Live provider search handoffs are built in" },
      emailHandoff: { ready: true, note: "Opens the customer’s email app for review and sending" },
      textHandoff: { ready: true, note: "Opens the customer’s text app for review and sending" },
      calendarExport: { ready: true, note: "Downloadable calendar files need no account connection" },
      stripe: { ready: Boolean(process.env.STRIPE_SECRET_KEY), note: process.env.STRIPE_SECRET_KEY ? "Private Stripe credential is configured" : "Private Stripe credential has not been configured" },
      openai: { ready: Boolean(process.env.OPENAI_API_KEY), note: process.env.OPENAI_API_KEY ? "Private OpenAI credential is configured" : "Private OpenAI credential has not been configured" },
    },
  });
}
