import type { APIRoute } from "astro"
import { ChatRequestSchema } from "@shared/schemas"
import { jsonError } from "@/lib/http"
import { assistantTextFromSse } from "@/lib/sse"
import { upstream } from "@/lib/upstream"
import { appendMessage, deleteMessage, getThread, listMessages } from "@/server/threads"

export const prerender = false

const MAX_BODY_BYTES = 256 * 1024
// The model gets a bounded window; unbounded history would eventually exceed
// the upstream context and amplify cost on every repeat call.
const MAX_HISTORY_MESSAGES = 20

/** Reads at most `limit` bytes, returning null when the body is larger. */
async function readBounded(request: Request, limit: number): Promise<string | null> {
  if (!request.body) return null
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.length
      if (size > limit) return null
      chunks.push(value)
    }
  } finally {
    reader.cancel().catch(() => {})
  }
  const body = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.length
  }
  return new TextDecoder().decode(body)
}

export const POST: APIRoute = async (context) => {
  const { key, base } = upstream()
  if (!key) return jsonError("INTERNAL", "Server is missing its model API key.", 500)

  const raw = await readBounded(context.request, MAX_BODY_BYTES)
  if (raw === null) return jsonError("VALIDATION_ERROR", "Request body too large.", 413)

  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return jsonError("VALIDATION_ERROR", "Invalid chat request.", 422)
  }

  const parsed = ChatRequestSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Invalid chat request.", 422, parsed.error.issues)
  }

  const { threadId, text } = parsed.data
  const thread = await getThread(threadId)
  if (!thread) return jsonError("NOT_FOUND", "Chat not found.", 404)

  const history = await listMessages(threadId)
  const userMessageId = await appendMessage(threadId, "user", text)

  const messages = [
    ...history.slice(-MAX_HISTORY_MESSAGES).map((message) => ({ role: message.role, content: message.content })),
    { role: "user", content: text },
  ]

  let response: Response
  try {
    response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        "user-agent": "edith/0.1",
        "x-opencode-session": threadId,
      },
      body: JSON.stringify({ model: thread.model, messages, stream: true }),
      // No timeout: streams run long, and a client disconnect aborts upstream.
      signal: context.request.signal,
    })
  } catch {
    await deleteMessage(userMessageId).catch(() => {})
    return jsonError("UPSTREAM_ERROR", "Could not reach the model.", 502)
  }

  if (!response.ok || !response.body) {
    // Keep the provider's body server-side; never echo it to the client.
    const detail = response.body ? (await response.text()).slice(0, 500) : ""
    console.error(`upstream chat failed: ${response.status} ${detail}`)
    await deleteMessage(userMessageId).catch(() => {})
    return jsonError("UPSTREAM_ERROR", `Model request failed (${response.status}).`, 502)
  }

  // Stream to the client and record the reply independently, so a client abort
  // still persists whatever was received.
  const [toClient, toRecord] = response.body.tee()
  const record = (async () => {
    const reader = toRecord.getReader()
    const decoder = new TextDecoder()
    let raw = ""
    try {
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        raw += decoder.decode(value, { stream: true })
      }
      raw += decoder.decode()
    } catch {
      // aborted or upstream error; record what we have
    } finally {
      reader.cancel().catch(() => {})
      const content = assistantTextFromSse(raw).trim()
      if (content) {
        await appendMessage(threadId, "assistant", content).catch((cause) =>
          console.error("failed to record assistant message", cause),
        )
      }
    }
  })()
  context.locals.cfContext?.waitUntil(record)

  return new Response(toClient, {
    status: 200,
    headers: {
      "content-type": response.headers.get("content-type") ?? "text/event-stream",
      "cache-control": "no-store",
    },
  })
}
