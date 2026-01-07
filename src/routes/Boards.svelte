<script lang="ts">
  import { onMount } from "svelte";
  import { auth, signOut } from "../stores/auth.store";
  import { push } from "svelte-spa-router";

  type Board = {
    id: number;
    name: string;
    description?: string | null;
    createdAt?: string;
  };

  let boards: Board[] = [];
  let loading = false;
  let creating = false;
  let error: string | null = null;

  let name = "";
  let description = "";
  let showCreate = false;

  function openCreate() {
    showCreate = true;
  }

  function closeCreate() {
    showCreate = false;
    error = null;
    name = "";
    description = "";
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && showCreate) closeCreate();
  }

  async function handleCreate() {
    await createBoard();
    if (!error) closeCreate();
  }

  $: if ($auth.initialized && !$auth.token) push("/login");

  const API_BASE = import.meta.env.VITE_API_URL;

  async function fetchBoards() {
    loading = true;
    error = null;

    try {
      const res = await fetch(`${API_BASE}/boards`, {
        method: "GET",
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
      // Expecting an array or an object with { boards }
      if (Array.isArray(data)) boards = data;
      else if (Array.isArray((data as any).boards)) boards = (data as any).boards;
      else boards = [];
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  async function createBoard() {
    if (!name.trim()) {
      error = "Please give the board a name.";
      return;
    }

    creating = true;
    error = null;

    try {
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
      // If API returns the new board directly, use it. Otherwise, reload list.
      if (created && (created.id || (created.board && created.board.id))) {
        const newB = created.id ? created : created.board;
        boards = [newB, ...boards];
      } else {
        await fetchBoards();
      }

      name = "";
      description = "";
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      creating = false;
    }
  }

  function viewBoard(b: Board) {
    // Navigate to a per-board route — create if you want detail views later
    push(`/boards/${b.id}`);
  }

  onMount(() => {
    fetchBoards();
  });
</script>

<svelte:window on:keydown={onKeyDown} />

<section class="min-h-screen p-8">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Your boards</h1>
      <p class="text-sm text-gray-600">Visualize and create boards for your projects.</p>
    </div>

    <div class="flex items-center gap-3">
      <button class="px-4 py-2 rounded-md text-white font-semibold"
        style="background: var(--color-accent); box-shadow: 0 6px 18px rgba(var(--color-accent-rgb),0.12);"
        on:click={() => { fetchBoards(); }}>
        Refresh
      </button>

      <button class="px-4 py-2 rounded-md bg-transparent border border-gray-200 hover:bg-gray-50"
        on:click={() => signOut()}>
        Sign out
      </button>
    </div>
  </div>

  <div class="mt-6">
    <!-- Floating create button (bottom-right) -->
    <div class="fixed bottom-6 right-6 z-50">
      <button aria-label="Create board" class="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transform hover:scale-105 transition"
        style="background: var(--color-accent); box-shadow: 0 10px 30px rgba(var(--color-accent-rgb),0.18);"
        on:click={openCreate}>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>

    {#if showCreate}
      <div class="fixed inset-0 z-40 flex items-center justify-center">
        <button type="button" class="absolute inset-0 bg-black/50 border-0 p-0 m-0 focus:outline-none" aria-label="Close create dialog" on:click={closeCreate}></button>
        <div class="relative bg-white rounded-2xl shadow-lg p-6 w-full max-w-md mx-4" role="dialog" aria-modal="true" aria-labelledby="create-dialog-title" style="background: var(--color-card);">
          <h2 id="create-dialog-title" class="text-lg font-semibold mb-2">Create board</h2>

          {#if error}
            <p class="text-sm text-red-600 mb-3">{error}</p>
          {/if}

          <form on:submit|preventDefault={async () => { await handleCreate(); }}>
            <div class="mb-3">
              <label for="board-name" class="block text-sm font-medium mb-1">Name</label>
              <input id="board-name" type="text" bind:value={name} placeholder="Board name"
                class="w-full px-3 py-2 rounded-md border border-gray-200 focus:outline-none" />
            </div>

            <div class="mb-3">
              <label for="board-desc" class="block text-sm font-medium mb-1">Description (optional)</label>
              <input id="board-desc" type="text" bind:value={description} placeholder="Short description"
                class="w-full px-3 py-2 rounded-md border border-gray-200 focus:outline-none" />
            </div>

            <div class="flex justify-end gap-3">
              <button type="button" class="px-4 py-2 rounded-md bg-transparent border border-gray-200" on:click={closeCreate}>Cancel</button>
              <button type="submit" class="px-4 py-2 rounded-md text-white font-semibold"
                style="background: var(--color-accent); box-shadow: 0 8px 24px rgba(var(--color-accent-rgb),0.12);"
                disabled={creating}>
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    {/if}

    <!-- Boards grid -->
    {#if loading}
      <div class="p-6 bg-white rounded-2xl shadow mt-6" style="background: var(--color-card);">Loading boards…</div>
    {:else if boards.length === 0}
      <div class="p-6 bg-white rounded-2xl shadow mt-6" style="background: var(--color-card);">
        <p class="text-gray-600">No boards yet. Create your first board.</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {#each boards as b}
          <div class="bg-white rounded-xl shadow p-5 flex flex-col justify-between" style="background: var(--color-card);">
            <div>
              <h3 class="text-lg font-semibold mb-1">{b.name}</h3>
              {#if b.description}
                <p class="text-sm text-gray-600 mb-3">{b.description}</p>
              {/if}
              {#if b.createdAt}
                <p class="text-xs text-gray-400">Created: {new Date(b.createdAt).toLocaleString()}</p>
              {/if}
            </div>

            <div class="mt-4 flex gap-3">
              <button class="px-3 py-2 rounded-md text-white text-sm" style="background: var(--color-accent);" on:click={() => viewBoard(b)}>View</button>
              <button class="px-3 py-2 rounded-md bg-transparent border border-gray-200 text-sm hover:bg-gray-50" on:click={() => { navigator.clipboard?.writeText(location.origin + `/boards/${b.id}`); }}>
                Copy link
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</section>
