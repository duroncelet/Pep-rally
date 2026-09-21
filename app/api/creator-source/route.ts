import { env } from "cloudflare:workers";
import { getChatGPTUser, chatGPTSignInPath } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required", signIn: chatGPTSignInPath("/") }, { status: 401 });
  const form = await request.formData();
  const file = form.get("source");
  if (!(file instanceof File)) return Response.json({ error: "Choose a source file" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return Response.json({ error: "Source uploads are limited to 10 MB" }, { status: 413 });
  const allowed = ["application/zip", "application/x-zip-compressed", "text/plain", "application/json", "text/csv"];
  if (!allowed.includes(file.type) && !file.name.match(/\.(zip|txt|json|csv|md)$/i)) return Response.json({ error: "Upload a ZIP, JSON, CSV, Markdown, or text file" }, { status: 415 });
  if (!env.RALLY_UPLOADS) return Response.json({ error: "Upload storage is unavailable" }, { status: 503 });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100);
  const key = `creator-sources/${user.userId}/${crypto.randomUUID()}-${safeName}`;
  await env.RALLY_UPLOADS.put(key, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" }, customMetadata: { owner: user.userId, originalName: file.name } });
  return Response.json({ key, name: file.name, size: file.size }, { status: 201 });
}
