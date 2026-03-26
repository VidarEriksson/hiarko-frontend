<script lang="ts">
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import { auth } from "../../stores/auth.store";
  import { getOrg, deleteOrg, removeOrgMember, updateOrgMemberRole, createOrgInvite } from "../../lib/api";

  export let params: { id: string } = { id: "" };

  type Member = { userId: number; role: string; user: { id: number; name: string | null; email: string } };
  type Board = { id: number; name: string; createdAt: string };

  let org: { id: number; name: string; ownerId: number; members: Member[]; boards: Board[] } | null = null;
  let myRole: string = "";
  let loading = false;
  let error: string | null = null;

  let showInviteForm = false;
  let inviteEmail = "";
  let inviteLoading = false;
  let inviteError: string | null = null;
  let inviteLink: string | null = null;
  let copied = false;

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

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    inviteLoading = true;
    inviteError = null;
    inviteLink = null;
    try {
      const data = await createOrgInvite(params.id, inviteEmail.trim());
      inviteLink = data.link;
      inviteEmail = "";
    } catch (e) {
      inviteError = e instanceof Error ? e.message : String(e);
    } finally {
      inviteLoading = false;
    }
  }

  async function copyLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  function closeInviteForm() {
    showInviteForm = false;
    inviteEmail = "";
    inviteLink = null;
    inviteError = null;
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
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold" style="color: var(--color-foreground);">Members <span style="color: var(--color-secondary); font-weight: 400;">({org.members.length})</span></h2>
          {#if canManage}
            <button
              class="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style="background: rgba(124,58,237,0.08); color: var(--color-accent); border: none; cursor: pointer;"
              on:click={() => { showInviteForm = !showInviteForm; inviteLink = null; inviteError = null; }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Invite
            </button>
          {/if}
        </div>

        {#if showInviteForm && canManage}
          <div class="rounded-xl p-4 mb-3" style="background: var(--color-card); border: 1px solid var(--color-border);">
            {#if inviteLink}
              <p class="text-xs font-medium mb-2" style="color: var(--color-foreground);">Invite link created — share this with {inviteEmail || 'them'}:</p>
              <div class="flex items-center gap-2">
                <input
                  type="text"
                  readonly
                  value={inviteLink}
                  class="flex-1 text-xs px-3 py-2 rounded-lg font-mono select-all"
                  style="background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-secondary); outline: none;" />
                <button
                  class="text-xs px-3 py-2 rounded-lg font-medium flex-shrink-0 transition-colors"
                  style="background: {copied ? 'rgba(34,197,94,0.1)' : 'rgba(124,58,237,0.08)'}; color: {copied ? '#16a34a' : 'var(--color-accent)'}; border: none; cursor: pointer;"
                  on:click={copyLink}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div class="flex items-center justify-between mt-3">
                <p class="text-xs" style="color: var(--color-secondary);">Link expires in 7 days.</p>
                <button class="text-xs" style="color: var(--color-secondary); background: none; border: none; cursor: pointer;" on:click={() => { inviteLink = null; }}>Invite another</button>
              </div>
            {:else}
              <p class="text-xs mb-3" style="color: var(--color-secondary);">Enter the email address of the person you want to invite. They'll get a link to join this organization.</p>
              <form on:submit|preventDefault={handleInvite} class="flex items-center gap-2">
                <input
                  type="email"
                  placeholder="email@example.com"
                  bind:value={inviteEmail}
                  class="flex-1 text-sm px-3 py-2 rounded-lg"
                  style="background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-foreground); outline: none; font-family: inherit;" />
                <button
                  type="submit"
                  disabled={inviteLoading || !inviteEmail.trim()}
                  class="text-sm px-3.5 py-2 rounded-lg font-medium flex-shrink-0"
                  style="background: var(--color-accent); color: white; border: none; cursor: pointer; opacity: {inviteLoading || !inviteEmail.trim() ? 0.5 : 1};">
                  {inviteLoading ? 'Creating…' : 'Create link'}
                </button>
              </form>
              {#if inviteError}
                <p class="text-xs mt-2" style="color: #dc2626;">{inviteError}</p>
              {/if}
            {/if}
            <button class="text-xs mt-3 block" style="color: var(--color-secondary); background: none; border: none; cursor: pointer; padding: 0;" on:click={closeInviteForm}>Close</button>
          </div>
        {/if}

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
