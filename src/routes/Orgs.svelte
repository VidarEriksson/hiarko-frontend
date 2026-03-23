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
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Organizations</h1>
      <p class="text-sm text-gray-600">Manage your teams and shared boards.</p>
    </div>
    <button
      class="px-4 py-2 rounded-md text-white font-semibold"
      style="background: var(--color-accent);"
      on:click={() => { showCreate = true; error = null; }}>
      New organization
    </button>
  </div>

  {#if showCreate}
    <div class="fixed inset-0 z-40 flex items-center justify-center">
      <button type="button" class="absolute inset-0 bg-black/50 border-0 p-0 m-0 focus:outline-none" aria-label="Close" on:click={() => { showCreate = false; error = null; }}></button>
      <div class="relative bg-white rounded-2xl shadow-lg p-6 w-full max-w-md mx-4" role="dialog" aria-modal="true" style="background: var(--color-card);">
        <h2 class="text-lg font-semibold mb-4">Create organization</h2>

        {#if error}
          <p class="text-sm text-red-600 mb-3">{error}</p>
        {/if}

        <form on:submit|preventDefault={handleCreate}>
          <div class="mb-4">
            <label for="org-name" class="block text-sm font-medium mb-1">Name</label>
            <input id="org-name" type="text" bind:value={newName} placeholder="Acme Inc."
              class="w-full px-3 py-2 rounded-md border border-gray-200 focus:outline-none" />
          </div>
          <div class="flex justify-end gap-3">
            <button type="button" class="px-4 py-2 rounded-md border border-gray-200"
              on:click={() => { showCreate = false; error = null; }}>Cancel</button>
            <button type="submit" disabled={creating}
              class="px-4 py-2 rounded-md text-white font-semibold"
              style="background: var(--color-accent);">
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <div class="mt-6">
    {#if loading}
      <div class="p-6 bg-white rounded-2xl shadow" style="background: var(--color-card);">Loading…</div>
    {:else if orgs.length === 0}
      <div class="p-6 bg-white rounded-2xl shadow" style="background: var(--color-card);">
        <p class="text-gray-600">No organizations yet. Create one to get started.</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each orgs as org}
          <button
            class="bg-white rounded-xl shadow p-5 text-left hover:shadow-md transition"
            style="background: var(--color-card);"
            on:click={() => push(`/orgs/${org.id}`)}>
            <h3 class="text-lg font-semibold mb-1">{org.name}</h3>
            {#if org._count}
              <p class="text-sm text-gray-500">
                {org._count.members} {org._count.members === 1 ? "member" : "members"} ·
                {org._count.boards} {org._count.boards === 1 ? "board" : "boards"}
              </p>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>
</section>
