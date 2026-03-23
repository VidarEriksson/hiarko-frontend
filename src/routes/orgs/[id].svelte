<script lang="ts">
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import { auth } from "../../stores/auth.store";
  import { getOrg, deleteOrg, removeOrgMember, updateOrgMemberRole } from "../../lib/api";

  export let params: { id: string } = { id: "" };

  type Member = { userId: number; role: string; user: { id: number; name: string | null; email: string } };
  type Board = { id: number; name: string; createdAt: string };

  let org: { id: number; name: string; ownerId: number; members: Member[]; boards: Board[] } | null = null;
  let myRole: string = "";
  let loading = false;
  let error: string | null = null;

  $: if ($auth.initialized && !$auth.token) push("/login");
  $: canManage = myRole === "OWNER" || myRole === "ADMIN";

  async function fetchOrg() {
    loading = true;
    error = null;
    try {
      const data = await getOrg(params.id);
      org = data.org;
      myRole = data.role;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  async function handleRemoveMember(userId: number) {
    try {
      await removeOrgMember(params.id, userId);
      org = { ...org!, members: org!.members.filter(m => m.userId !== userId) };
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  async function handleRoleChange(userId: number, role: string) {
    try {
      await updateOrgMemberRole(params.id, userId, role);
      org = {
        ...org!,
        members: org!.members.map(m => m.userId === userId ? { ...m, role } : m),
      };
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  async function handleDeleteOrg() {
    if (!confirm(`Delete "${org?.name}"? This cannot be undone.`)) return;
    try {
      await deleteOrg(params.id);
      push("/orgs");
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  onMount(fetchOrg);
</script>

<section class="min-h-screen p-8">
  <button class="text-sm text-gray-500 hover:text-gray-800 mb-6 flex items-center gap-1"
    on:click={() => push("/orgs")}>
    ← Organizations
  </button>

  {#if loading}
    <div class="p-6 bg-white rounded-2xl shadow" style="background: var(--color-card);">Loading…</div>
  {:else if error}
    <div class="p-6 bg-white rounded-2xl shadow text-red-600" style="background: var(--color-card);">{error}</div>
  {:else if org}
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold">{org.name}</h1>
        <p class="text-sm text-gray-500 mt-1">Your role: <span class="font-medium">{myRole}</span></p>
      </div>
      {#if myRole === "OWNER"}
        <button class="px-4 py-2 rounded-md border border-red-200 text-red-600 text-sm hover:bg-red-50"
          on:click={handleDeleteOrg}>
          Delete organization
        </button>
      {/if}
    </div>

    <!-- Boards -->
    <div class="mb-10">
      <h2 class="text-lg font-semibold mb-4">Boards</h2>
      {#if org.boards.length === 0}
        <p class="text-gray-500 text-sm">No boards yet.</p>
      {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each org.boards as board}
            <button class="bg-white rounded-xl shadow p-4 text-left hover:shadow-md transition"
              style="background: var(--color-card);"
              on:click={() => push(`/boards/${board.id}`)}>
              <h3 class="font-semibold">{board.name}</h3>
              <p class="text-xs text-gray-400 mt-1">{new Date(board.createdAt).toLocaleDateString()}</p>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Members -->
    <div>
      <h2 class="text-lg font-semibold mb-4">Members</h2>
      <div class="bg-white rounded-xl shadow divide-y" style="background: var(--color-card);">
        {#each org.members as member}
          <div class="flex items-center justify-between px-4 py-3">
            <div>
              <p class="font-medium text-sm">{member.user.name ?? member.user.email}</p>
              {#if member.user.name}
                <p class="text-xs text-gray-400">{member.user.email}</p>
              {/if}
            </div>
            <div class="flex items-center gap-3">
              {#if canManage && member.role !== "OWNER"}
                <select
                  class="text-sm border border-gray-200 rounded-md px-2 py-1 focus:outline-none"
                  value={member.role}
                  on:change={(e) => handleRoleChange(member.userId, (e.target as HTMLSelectElement).value)}>
                  <option value="ADMIN">Admin</option>
                  <option value="MEMBER">Member</option>
                </select>
                <button class="text-sm text-red-500 hover:text-red-700"
                  on:click={() => handleRemoveMember(member.userId)}>
                  Remove
                </button>
              {:else}
                <span class="text-sm text-gray-500">{member.role}</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</section>
