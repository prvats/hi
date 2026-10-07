<script setup lang="ts">
import { computed, ref } from "vue"
import { Plus, Search } from "@/components/icons"
import type { Thread } from "@shared/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import ThreadItem from "./ThreadItem.vue"

const props = defineProps<{ threads: Thread[]; activeId: string | null }>()
const emit = defineEmits<{
  create: []
  select: [id: string]
  rename: [id: string, title: string]
  remove: [id: string]
}>()

const query = ref("")
const filtered = computed(() => {
  const needle = query.value.trim().toLowerCase()
  if (!needle) return props.threads
  return props.threads.filter((thread) => thread.title.toLowerCase().includes(needle))
})
</script>

<template>
  <aside class="flex flex-col bg-sidebar text-sidebar-foreground">
    <div class="flex h-14 items-center gap-2 px-3">
      <span class="text-sm font-semibold tracking-tight">hi</span>
      <Button
        variant="ghost"
        size="icon"
        class="ml-auto"
        aria-label="New chat"
        @click="emit('create')"
      >
        <Plus class="size-4" />
      </Button>
    </div>

    <div class="px-3 pb-2">
      <div class="relative">
        <Search class="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          v-model="query"
          type="search"
          name="search"
          placeholder="Search chats"
          aria-label="Search chats"
          class="h-8 pl-8 text-sm"
        />
      </div>
    </div>

    <ScrollArea class="min-h-0 flex-1">
      <nav class="flex flex-col gap-0.5 px-2 pb-3" aria-label="Chats">
        <ThreadItem
          v-for="thread in filtered"
          :key="thread.id"
          :thread="thread"
          :active="thread.id === activeId"
          @select="emit('select', thread.id)"
          @rename="(title) => emit('rename', thread.id, title)"
          @remove="emit('remove', thread.id)"
        />
        <p v-if="!filtered.length" class="px-2 py-6 text-center text-xs text-muted-foreground">
          {{ threads.length ? "No chats match your search." : "No chats yet." }}
        </p>
      </nav>
    </ScrollArea>

    <div class="border-t px-3 py-2 text-xs text-muted-foreground">Saved in your Cloudflare account</div>
  </aside>
</template>
