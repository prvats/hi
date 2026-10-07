import type { APIRoute } from "astro"
import { jsonError } from "@/lib/http"
import { upstream } from "@/lib/upstream"

export const prerender = false

export const GET: APIRoute = async (context) => {
  const { key, base } = upstream()
  if (!key) return jsonError("INTERNAL", "Server is missing its model API key.", 500)

  let response: Response
  try {
    response = await fetch(`${base}/models`, {
      headers: { authorization: `Bearer ${key}`, "user-agent": "hi/0.1" },
      signal: context.request.signal,
    })
  } catch {
    return jsonError("UPSTREAM_ERROR", "Could not reach the model catalog.", 502)
  }

  if (!response.ok) {
    console.error(`upstream models failed: ${response.status}`)
    return jsonError("UPSTREAM_ERROR", `Model catalog failed (${response.status}).`, 502)
  }

  // Normalize the provider response to `{ data: string[] }` so the client never
  // needs to know the provider's shape.
  const body = (await response.json().catch(() => null)) as
    | Array<{ id?: string } | string>
    | { data?: Array<{ id?: string } | string> }
    | null
  const items = Array.isArray(body) ? body : (body?.data ?? [])
  const ids = items
    .map((item) => (typeof item === "string" ? item : item?.id))
    .filter((id): id is string => typeof id === "string" && id.length > 0)

  return Response.json({ data: ids }, { headers: { "cache-control": "no-store" } })
}
