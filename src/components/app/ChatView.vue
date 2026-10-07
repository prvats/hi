<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue"
import { ChevronDown, Menu, MessageSquare, TriangleAlert } from "@/components/icons"
import type { Message, Model, Thread } from "@shared/types"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import MessageItem from "./MessageItem.vue"
import Composer from "./Composer.vue"

const props = defineProps<{
  thread: Thread | null
  messages: Message[]
  models: Model[]
  streaming: boolean
  loading: boolean
  error: string | null
}>()

const emit = defineEmits<{
  send: [value: string]
  stop: []
  "open-sidebar": []
  "set-model": [model: string]
}>()

const scroller = ref<HTMLElement | null>(null)
const modelLabel = computed(() => {
  const id = props.thread?.model
  return props.models.find((model) => model.id === id)?.label ?? id ?? ""
})
const status = computed(() => (props.streaming ? "Assistant is responding" : ""))

function scrollToBottom() {
  const node = scroller.value
  if (node) node.scrollTop = node.scrollHeight
}

watch(
  () => props.thread?.id,
  async () => {
    await nextTick()
    scrollToBottom()
  },
)

// Follow the stream only when the reader is already near the bottom.
watch(
  () => [props.messages.length, props.messages.at(-1)?.content.length ?? 0],
  async () => {
    await nextTick()
    const node = scroller.value
    if (!node) return
    if (node.scrollHeight - node.scrollTop - node.clientHeight < 80) scrollToBottom()
  },
)
</script>

<template>
  <main class="flex min-w-0 flex-1 flex-col">
    <header class="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <Button variant="ghost" size="icon" class="md:hidden" aria-label="Open chats" @click="emit('open-sidebar')">
        <Menu class="size-4" />
      </Button>
      <h1 class="truncate text-sm font-medium">{{ thread?.title ?? "hi" }}</h1>

      <DropdownMenu v-if="thread">
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="sm" class="ml-auto gap-1 text-muted-foreground" :aria-label="`Model: ${modelLabel}`">
            {{ modelLabel }}
            <ChevronDown class="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-52">
          <DropdownMenuItem v-for="model in models" :key="model.id" @select="emit('set-model', model.id)">
            {{ model.label }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>

    <div ref="scroller" class="min-h-0 flex-1 overflow-y-auto">
      <p class="sr-only" role="status">{{ status }}</p>

      <div
        v-if="error"
        role="alert"
        class="mx-auto mt-4 flex w-full max-w-3xl items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
      >
        <TriangleAlert class="mt-0.5 size-4 shrink-0" />
        <p>{{ error }}</p>
      </div>

      <div
        v-if="loading"
        class="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6"
        aria-busy="true"
        aria-label="Loading messages"
      >
        <Skeleton class="h-4 w-16" />
        <Skeleton class="h-4 w-4/5" />
        <Skeleton class="h-4 w-3/5" />
      </div>

      <div v-else-if="!thread" class="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
        Select or start a chat.
      </div>

      <div v-else-if="!messages.length" class="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <MessageSquare class="size-8 text-muted-foreground" />
        <div>
          <h2 class="text-sm font-medium">Start the conversation</h2>
          <p class="mt-1 text-sm text-muted-foreground">Ask anything, or brainstorm out loud.</p>
        </div>
      </div>

      <div v-else class="py-2" role="log" :aria-busy="streaming">
        <MessageItem v-for="message in messages" :key="message.id" :message="message" />
      </div>
    </div>

    <Composer :disabled="!thread || loading" :streaming="streaming" @send="emit('send', $event)" @stop="emit('stop')" />
  </main>
</template>
