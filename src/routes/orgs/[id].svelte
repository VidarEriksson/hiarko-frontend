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
      org = { ...org!, members: org!.members.map(m => m.userId === userId ? { ...m, role } : m) };
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
  <div class="max-w-4xl mx-auto">
    <button class="flex items-center gap-1.5 text-sm mb-6 transition-colors"
      style="color: var(--color-secondary);"
      on:click={() => push("/orgs")}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
      Organizations
    </button>

    {#if loading}
      <div class="space-y-4">
        <div class="h-8 w-48 rounded-lg animate-pulse" style="background: var(--color-border);"></div>
        <div class="h-40 rounded-xl animate-pulse" style="background: var(--color-border);"></div>
      </div>
    {:else if error}
      <div class="px-4 py-3 rounded-lg text-sm" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;">{error}</div>
    {:else if org}
      <!-- Header -->
      <div class="flex items-start justify-between mb-8">
        <div>
          <h1 class="text-xl font-semibold mb-1" style="color: var(--color-foreground); letter-spacing: -0.3px;">{org.name}</h1>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style="background: rgba(124,58,237,0.08); color: var(--color-accent);">{myRole}</span>
        </div>
        {#if myRole === "OWNER"}
          <button class="px-3.5 py-2 rounded-lg text-sm font-medium transition-colors"
            style="border: 1px solid #fecaca; color: #dc2626; background: transparent;"
            on:click={handleDeleteOrg}>
            Delete organization
          </button>
        {/if}
      </div>

      <!-- Boards -->
      <div class="mb-8">
        <h2 class="text-sm font-semibold mb-3" style="color: var(--color-foreground);">Boards</h2>
        {#if org.boards.length === 0}
          <p class="text-sm" style="color: var(--color-secondary);">No boards yet. Create a board from the Boards page and select this organization.</p>
        {:else}
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {#each org.boards as board}
              <button
                class="rounded-xl p-4 text-left transition-shadow hover:shadow-md"
                style="background: var(--color-card); border: 1px solid var(--color-border);"
                on:click={() => push(`/boards/${board.id}`)}>
                <h3 class="font-medium text-sm mb-1" style="color: var(--color-foreground);">{board.name}</h3>
                <p class="text-xs" style="color: var(--color-secondary);">
                  {new Date(board.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Members -->
      <div>
        <h2 class="text-sm font-semibold mb-3" style="color: var(--color-foreground);">Members <span style="color: var(--color-secondary); font-weight: 400;">({org.members.length})</span></h2>
        <div class="rounded-xl overflow-hidden" style="border: 1px solid var(--color-border);">
          {#each org.members as member, i}
            <div class="flex items-center justify-between px-4 py-3"
              style="background: var(--color-card); {i < org.members.length - 1 ? `border-bottom: 1px solid var(--color-border);` : ''}">
              <div class="flex items-center gap-3">
                <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                  style="background: var(--color-accent);">
                  {(member.user.name ?? member.user.email)[0].toUpperCase()}
                </div>
                <div>
                  <p class="text-sm font-medium" style="color: var(--color-foreground);">{member.user.name ?? member.user.email}</p>
                  {#if member.user.name}
                    <p class="text-xs" style="color: var(--color-secondary);">{member.user.email}</p>
                  {/if}
                </div>
              </div>
              <div class="flex items-center gap-2">
                {#if canManage && member.role !== "OWNER"}
                  <select
                    class="text-xs px-2.5 py-1.5 rounded-lg cursor-pointer focus:outline-none"
                    style="border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-foreground);"
                    value={member.role}
                    on:change={(e) => handleRoleChange(member.userId, (e.target as HTMLSelectElement).value)}>
                    <option value="ADMIN">Admin</option>
                    <option value="MEMBER">Member</option>
                  </select>
                  <button
                    class="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                    style="color: #dc2626; background: transparent; border: 1px solid #fecaca;"
                    on:click={() => handleRemoveMember(member.userId)}>
                    Remove
                  </button>
                {:else}
                  <span class="text-xs font-medium px-2.5 py-1 rounded-full"
                    style="background: rgba(124,58,237,0.08); color: var(--color-accent);">
                    {member.role}
                  </span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</section>
