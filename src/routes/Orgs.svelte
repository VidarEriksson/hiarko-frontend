<script lang="ts">
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import { auth } from "../stores/auth.store";
  import { listOrgs, createOrg } from "../lib/api";

  type Org = { id: number; name: string; _count?: { members: number; boards: number } };

  let orgs: Org[] = [];
  let loading = false;
  let error: string | null = null;
  let showCreate = false;
  let creating = false;
  let newName = "";

  $: if ($auth.initialized && !$auth.token) push("/login");

  async function fetchOrgs() {
    loading = true;
    error = null;
    try {
      const data = await listOrgs();
      orgs = data.orgs;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  async function handleCreate() {
    if (!newName.trim()) { error = "Please give the organization a name."; return; }
    creating = true;
    error = null;
    try {
      const data = await createOrg(newName.trim());
      orgs = [data.org, ...orgs];
      newName = "";
      showCreate = false;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      creating = false;
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && showCreate) { showCreate = false; error = null; }
  }

  onMount(fetchOrgs);
</script>

<svelte:window on:keydown={onKeyDown} />

<section class="min-h-screen p-8">
  <div class="max-w-6xl mx-auto">
    <div class="mb-8">
      <h1 class="text-xl font-semibold" style="color: var(--color-foreground); letter-spacing: -0.3px;">Organizations</h1>
      <p class="text-sm mt-0.5" style="color: var(--color-secondary);">Manage your teams and shared workspaces.</p>
    </div>

    <div class="flex items-center justify-between mb-6">
      <div></div>
      <button
        class="px-3.5 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2"
        style="background: var(--color-accent);"
        on:click={() => { showCreate = true; error = null; }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        New organization
      </button>
    </div>

    {#if showCreate}
      <div class="fixed inset-0 z-40 flex items-center justify-center">
        <button type="button" class="absolute inset-0 bg-black/40 border-0 p-0 m-0 focus:outline-none"
          aria-label="Close" on:click={() => { showCreate = false; error = null; }}></button>
        <div class="relative rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
          role="dialog" aria-modal="true"
          style="background: var(--color-card); border: 1px solid var(--color-border);">
          <h2 class="text-base font-semibold mb-4" style="color: var(--color-foreground);">New organization</h2>

          {#if error}
            <div class="px-3 py-2 rounded-lg text-sm mb-3" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;">{error}</div>
          {/if}

          <form on:submit|preventDefault={handleCreate} class="space-y-3">
            <div>
              <label for="org-name" class="block text-sm font-medium mb-1.5" style="color: var(--color-foreground);">Name</label>
              <input id="org-name" type="text" bind:value={newName} placeholder="e.g. Acme Inc."
                class="w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2"
                style="border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-foreground);" />
            </div>
            <div class="flex justify-end gap-2 pt-1">
              <button type="button"
                class="px-4 py-2 rounded-lg text-sm font-medium"
                style="background: transparent; border: 1px solid var(--color-border); color: var(--color-secondary);"
                on:click={() => { showCreate = false; error = null; }}>Cancel</button>
              <button type="submit" disabled={creating}
                class="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style="background: var(--color-accent);"
                class:opacity-60={creating}>
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    {/if}

    {#if loading}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each [1,2,3] as _}
          <div class="h-24 rounded-xl animate-pulse" style="background: var(--color-border);"></div>
        {/each}
      </div>
    {:else if orgs.length === 0}
      <div class="flex flex-col items-center justify-center py-20 text-center">
        <div class="w-10 h-10 rounded-xl mb-4 flex items-center justify-center" style="background: rgba(124,58,237,0.08);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--color-accent);" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 21h18M9 21V7l6-4v18M9 11H3v10M15 21V11h6v10"/>
          </svg>
        </div>
        <p class="font-medium text-sm mb-1" style="color: var(--color-foreground);">No organizations yet</p>
        <p class="text-sm" style="color: var(--color-secondary);">Create one to collaborate with your team.</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each orgs as org}
          <button
            class="rounded-xl p-5 text-left transition-shadow hover:shadow-md"
            style="background: var(--color-card); border: 1px solid var(--color-border);"
            on:click={() => push(`/orgs/${org.id}`)}>
            <div class="w-8 h-8 rounded-lg mb-3 flex items-center justify-center" style="background: rgba(124,58,237,0.08);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-accent);" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 21h18M9 21V7l6-4v18M9 11H3v10M15 21V11h6v10"/>
              </svg>
            </div>
            <h3 class="font-semibold text-sm mb-1" style="color: var(--color-foreground);">{org.name}</h3>
            {#if org._count}
              <p class="text-xs" style="color: var(--color-secondary);">
                {org._count.members} {org._count.members === 1 ? "member" : "members"} · {org._count.boards} {org._count.boards === 1 ? "board" : "boards"}
              </p>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>
</section>
