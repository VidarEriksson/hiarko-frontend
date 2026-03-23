<script lang="ts">
  import { onMount } from "svelte";
  import { auth } from "../stores/auth.store";
  import { push } from "svelte-spa-router";
  import { listOrgs, createOrgBoard } from "../lib/api";

  type Board = {
    id: number;
    name: string;
    description?: string | null;
    createdAt?: string;
    orgId?: number | null;
  };

  type Org = { id: number; name: string };

  let boards: Board[] = [];
  let orgs: Org[] = [];
  let loading = false;
  let creating = false;
  let error: string | null = null;

  let name = "";
  let description = "";
  let showCreate = false;
  let createOrgId: number | null = null;

  let filter: "all" | "personal" | number = "all";

  $: filteredBoards = filter === "all"
    ? boards
    : filter === "personal"
      ? boards.filter(b => !b.orgId)
      : boards.filter(b => b.orgId === filter);

  $: filterLabel = filter === "all"
    ? "All boards"
    : filter === "personal"
      ? "Personal"
      : orgs.find(o => o.id === filter)?.name ?? "Unknown";

  function openCreate() { createOrgId = null; showCreate = true; }

  function closeCreate() {
    showCreate = false;
    error = null;
    name = "";
    description = "";
    createOrgId = null;
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && showCreate) closeCreate();
  }

  $: if ($auth.initialized && !$auth.token) push("/login");

  const API_BASE = import.meta.env.VITE_API_URL;

  async function fetchBoards() {
    loading = true;
    error = null;
    try {
      const res = await fetch(`${API_BASE}/boards`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${$auth.token}`,
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any)?.message ?? `Failed to fetch boards (${res.status})`);
      }
      const data = await res.json();
      if (Array.isArray(data)) boards = data;
      else if (Array.isArray((data as any).boards)) boards = (data as any).boards;
      else boards = [];
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  async function handleCreate() {
    if (!name.trim()) { error = "Please give the board a name."; return; }
    creating = true;
    error = null;
    try {
      let newBoard: Board;
      if (createOrgId !== null) {
        const data = await createOrgBoard(createOrgId, name.trim());
        newBoard = data.board;
      } else {
        const res = await fetch(`${API_BASE}/boards`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${$auth.token}`,
          },
          body: JSON.stringify({ name: name.trim(), description: description.trim() }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as any)?.message ?? `Failed to create board (${res.status})`);
        }
        const created = await res.json();
        newBoard = created.board ?? created;
      }
      boards = [newBoard, ...boards];
      closeCreate();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      creating = false;
    }
  }

  onMount(async () => {
    await Promise.all([
      fetchBoards(),
      listOrgs().then(d => { orgs = d.orgs; }).catch(() => {}),
    ]);
  });
</script>

<svelte:window on:keydown={onKeyDown} />

<section class="min-h-screen p-8">
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-xl font-semibold" style="color: var(--color-foreground); letter-spacing: -0.3px;">Boards</h1>
      <p class="text-sm mt-0.5" style="color: var(--color-secondary);">Your project boards across all workspaces.</p>
    </div>

    <!-- Toolbar -->
    <div class="flex items-center justify-between mb-6">
      <select
        class="text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 cursor-pointer"
        style="border: 1px solid var(--color-border); background: var(--color-card); color: var(--color-foreground);"
        value={filter}
        on:change={(e) => {
          const v = (e.target as HTMLSelectElement).value;
          filter = v === "all" ? "all" : v === "personal" ? "personal" : Number(v);
        }}>
        <option value="all">All boards</option>
        <option value="personal">Personal</option>
        {#each orgs as org}
          <option value={org.id}>{org.name}</option>
        {/each}
      </select>

      <button
        class="px-3.5 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2"
        style="background: var(--color-accent);"
        on:click={openCreate}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        New board
      </button>
    </div>

    <!-- Create modal -->
    {#if showCreate}
      <div class="fixed inset-0 z-40 flex items-center justify-center">
        <button type="button" class="absolute inset-0 bg-black/40 border-0 p-0 m-0 focus:outline-none"
          aria-label="Close" on:click={closeCreate}></button>
        <div class="relative rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
          role="dialog" aria-modal="true"
          style="background: var(--color-card); border: 1px solid var(--color-border);">
          <h2 class="text-base font-semibold mb-4" style="color: var(--color-foreground);">New board</h2>

          {#if error}
            <div class="px-3 py-2 rounded-lg text-sm mb-3" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;">{error}</div>
          {/if}

          <form on:submit|preventDefault={handleCreate} class="space-y-3">
            <div>
              <label for="board-name" class="block text-sm font-medium mb-1.5" style="color: var(--color-foreground);">Name</label>
              <input id="board-name" type="text" bind:value={name} placeholder="e.g. Product Roadmap"
                class="w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2"
                style="border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-foreground);" />
            </div>

            {#if createOrgId === null}
              <div>
                <label for="board-desc" class="block text-sm font-medium mb-1.5" style="color: var(--color-foreground);">Description <span style="color: var(--color-secondary);">(optional)</span></label>
                <input id="board-desc" type="text" bind:value={description} placeholder="Short description"
                  class="w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2"
                  style="border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-foreground);" />
              </div>
            {/if}

            {#if orgs.length > 0}
              <div>
                <label for="board-location" class="block text-sm font-medium mb-1.5" style="color: var(--color-foreground);">Create in</label>
                <select id="board-location"
                  class="w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 cursor-pointer"
                  style="border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-foreground);"
                  value={createOrgId === null ? "personal" : String(createOrgId)}
                  on:change={(e) => {
                    const v = (e.target as HTMLSelectElement).value;
                    createOrgId = v === "personal" ? null : Number(v);
                  }}>
                  <option value="personal">Personal</option>
                  {#each orgs as org}
                    <option value={org.id}>{org.name}</option>
                  {/each}
                </select>
              </div>
            {/if}

            <div class="flex justify-end gap-2 pt-1">
              <button type="button"
                class="px-4 py-2 rounded-lg text-sm font-medium"
                style="background: transparent; border: 1px solid var(--color-border); color: var(--color-secondary);"
                on:click={closeCreate}>Cancel</button>
              <button type="submit" disabled={creating}
                class="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style="background: var(--color-accent);"
                class:opacity-60={creating}>
                {creating ? "Creating…" : "Create board"}
              </button>
            </div>
          </form>
        </div>
      </div>
    {/if}

    <!-- Boards grid -->
    {#if loading}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each [1,2,3] as _}
          <div class="h-28 rounded-xl animate-pulse" style="background: var(--color-border);"></div>
        {/each}
      </div>
    {:else if filteredBoards.length === 0}
      <div class="flex flex-col items-center justify-center py-20 text-center">
        <div class="w-10 h-10 rounded-xl mb-4 flex items-center justify-center" style="background: rgba(124,58,237,0.08);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--color-accent);" stroke-linecap="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
          </svg>
        </div>
        <p class="font-medium text-sm mb-1" style="color: var(--color-foreground);">
          {filter === "all" ? "No boards yet" : `No boards in ${filterLabel}`}
        </p>
        <p class="text-sm" style="color: var(--color-secondary);">Create a board to get started.</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each filteredBoards as b}
          <div
            class="rounded-xl p-5 flex flex-col justify-between cursor-pointer transition-shadow hover:shadow-md"
            style="background: var(--color-card); border: 1px solid var(--color-border);"
            role="button"
            tabindex="0"
            on:click={() => push(`/boards/${b.id}`)}
            on:keydown={(e) => e.key === 'Enter' && push(`/boards/${b.id}`)}>
            <div>
              {#if b.orgId}
                <div class="text-xs font-medium mb-2" style="color: var(--color-accent);">
                  {orgs.find(o => o.id === b.orgId)?.name ?? "Organization"}
                </div>
              {/if}
              <h3 class="font-semibold text-sm mb-1" style="color: var(--color-foreground);">{b.name}</h3>
              {#if b.description}
                <p class="text-xs" style="color: var(--color-secondary);">{b.description}</p>
              {/if}
            </div>
            {#if b.createdAt}
              <p class="text-xs mt-4" style="color: var(--color-secondary);">
                {new Date(b.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- FAB -->
  <div class="fixed bottom-6 right-6 z-50">
    <button aria-label="Create board"
      class="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-shadow"
      style="background: var(--color-accent);"
      on:click={openCreate}>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    </button>
  </div>
</section>
