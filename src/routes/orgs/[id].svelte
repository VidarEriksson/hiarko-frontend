<script lang="ts">
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import { auth } from "../../stores/auth.store";
  import { getOrg, deleteOrg, removeOrgMember, updateOrgMemberRole, createOrgInvite, listViews, createView, updateView, deleteView } from "../../lib/api";

  export let params: { id: string } = { id: "" };

  type Member = { userId: number; role: string; user: { id: number; name: string | null; email: string } };
  type Board = { id: number; name: string; createdAt: string };

  let org: { id: number; name: string; ownerId: number; members: Member[]; boards: Board[] } | null = null;
  let myRole: string = "";
  let loading = false;
  let error: string | null = null;

  // Views
  let views: any[] = [];
  let viewsLoading = false;
  let showViewModal = false;
  let editingView: any = null;
  let viewName = "";
  let viewAllBoards = true;
  let viewBoardIds: number[] = [];
  let viewColumnNames: string[] = [];
  let viewColumnInput = "";
  let viewDisplayType: "list" | "kanban" = "list";
  let viewGroupBy = "";
  let viewSortField = "position";
  let viewSortDirection: "asc" | "desc" = "asc";
  let viewSaving = false;
  let viewError: string | null = null;
  let confirmDeleteViewId: number | null = null;

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

  async function fetchViews() {
    viewsLoading = true;
    try {
      const data = await listViews(params.id);
      views = data.views;
    } catch {
      // non-critical
    } finally {
      viewsLoading = false;
    }
  }

  function openCreateView() {
    editingView = null;
    viewName = "";
    viewAllBoards = true;
    viewBoardIds = [];
    viewColumnNames = [];
    viewColumnInput = "";
    viewDisplayType = "list";
    viewGroupBy = "";
    viewSortField = "position";
    viewSortDirection = "asc";
    viewError = null;
    showViewModal = true;
  }

  function openEditView(view: any) {
    editingView = view;
    viewName = view.name;
    const cfg = view.config ?? {};
    viewAllBoards = !cfg.boardIds?.length;
    viewBoardIds = cfg.boardIds ?? [];
    viewColumnNames = cfg.columnNames ?? [];
    viewColumnInput = "";
    viewDisplayType = cfg.displayType ?? "list";
    viewGroupBy = cfg.groupBy ?? "";
    viewSortField = cfg.sortBy?.field ?? "position";
    viewSortDirection = cfg.sortBy?.direction ?? "asc";
    viewError = null;
    showViewModal = true;
  }

  function closeViewModal() {
    showViewModal = false;
    editingView = null;
    viewError = null;
  }

  function addViewColumn() {
    const name = viewColumnInput.trim();
    if (name && !viewColumnNames.includes(name)) {
      viewColumnNames = [...viewColumnNames, name];
    }
    viewColumnInput = "";
  }

  function toggleViewBoard(boardId: number) {
    viewBoardIds = viewBoardIds.includes(boardId)
      ? viewBoardIds.filter(id => id !== boardId)
      : [...viewBoardIds, boardId];
  }

  async function saveView() {
    if (!viewName.trim()) { viewError = "Name is required."; return; }
    viewSaving = true;
    viewError = null;
    const config = {
      boardIds: viewAllBoards ? null : (viewBoardIds.length ? viewBoardIds : null),
      columnNames: viewColumnNames.length ? viewColumnNames : null,
      displayType: viewDisplayType,
      groupBy: viewGroupBy || null,
      sortBy: { field: viewSortField, direction: viewSortDirection },
    };
    try {
      if (editingView) {
        const data = await updateView(params.id, editingView.id, { name: viewName.trim(), config });
        views = views.map(v => v.id === editingView.id ? data.view : v);
      } else {
        const data = await createView(params.id, viewName.trim(), config);
        views = [...views, data.view];
      }
      closeViewModal();
    } catch (e) {
      viewError = e instanceof Error ? e.message : String(e);
    } finally {
      viewSaving = false;
    }
  }

  async function handleDeleteView(viewId: number) {
    confirmDeleteViewId = null;
    try {
      await deleteView(params.id, viewId);
      views = views.filter(v => v.id !== viewId);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  onMount(() => {
    fetchOrg();
    fetchViews();
  });
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

      <!-- Views -->
      <div class="mb-8">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold" style="color: var(--color-foreground);">
            Views
            {#if views.length > 0}<span style="color: var(--color-secondary); font-weight: 400;"> ({views.length})</span>{/if}
          </h2>
          {#if canManage}
            <button
              class="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style="background: rgba(124,58,237,0.08); color: var(--color-accent); border: none; cursor: pointer;"
              on:click={openCreateView}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              New view
            </button>
          {/if}
        </div>

        {#if viewsLoading}
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {#each [1, 2] as _}
              <div class="h-20 rounded-xl animate-pulse" style="background: var(--color-border);"></div>
            {/each}
          </div>
        {:else if views.length === 0}
          <p class="text-sm" style="color: var(--color-secondary);">
            No views yet.{#if canManage} Create one to save a custom layout of tasks across boards.{/if}
          </p>
        {:else}
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {#each views as view}
              <div class="relative group rounded-xl transition-shadow hover:shadow-md"
                style="background: var(--color-card); border: 1px solid var(--color-border); cursor: pointer;"
                role="button"
                tabindex="0"
                on:click={() => push(`/orgs/${params.id}/views/${view.id}`)}
                on:keydown={(e) => e.key === 'Enter' && push(`/orgs/${params.id}/views/${view.id}`)}>
                <div class="p-4">
                  <div class="w-8 h-8 rounded-lg mb-3 flex items-center justify-center" style="background: rgba(124,58,237,0.08);">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-accent);" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </div>
                  <h3 class="font-semibold text-sm mb-1" style="color: var(--color-foreground);">{view.name}</h3>
                  <p class="text-xs leading-relaxed" style="color: var(--color-secondary);">
                    {#if view.config?.groupBy}Grouped by {view.config.groupBy}{:else}No grouping{/if}{#if view.config?.columnNames?.length} · {view.config.columnNames.join(', ')}{/if}
                  </p>
                </div>

                {#if canManage}
                  <div class="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    role="presentation"
                    on:click|stopPropagation
                    on:keydown|stopPropagation>
                    {#if confirmDeleteViewId === view.id}
                      <button class="text-xs px-2 py-1 rounded font-medium"
                        style="background: #dc2626; color: white; border: none; cursor: pointer;"
                        on:click={() => handleDeleteView(view.id)}>Delete</button>
                      <button class="text-xs px-2 py-1 rounded"
                        style="background: none; border: 1px solid var(--color-border); color: var(--color-secondary); cursor: pointer;"
                        on:click={() => confirmDeleteViewId = null}>Cancel</button>
                    {:else}
                      <button class="p-1.5 rounded-md transition-colors"
                        style="background: var(--color-bg); border: none; cursor: pointer; color: var(--color-secondary);"
                        title="Edit view"
                        on:click={() => openEditView(view)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button class="p-1.5 rounded-md transition-colors"
                        style="background: var(--color-bg); border: none; cursor: pointer; color: var(--color-secondary);"
                        title="Delete view"
                        on:click={() => confirmDeleteViewId = view.id}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                        </svg>
                      </button>
                    {/if}
                  </div>
                {/if}
              </div>
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

{#if showViewModal && canManage}
  <div class="fixed inset-0 z-40 flex items-center justify-center">
    <button type="button" class="absolute inset-0 bg-black/40 border-0 p-0 m-0 focus:outline-none"
      aria-label="Close" on:click={closeViewModal}></button>
    <div class="relative rounded-xl shadow-xl w-full max-w-lg mx-4"
      role="dialog" aria-modal="true"
      style="background: var(--color-card); border: 1px solid var(--color-border); max-height: 90vh; display: flex; flex-direction: column;">
      <div class="p-6 overflow-y-auto">
        <h2 class="text-base font-semibold mb-5" style="color: var(--color-foreground);">
          {editingView ? 'Edit view' : 'New view'}
        </h2>

        {#if viewError}
          <div class="px-3 py-2 rounded-lg text-sm mb-4" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;">{viewError}</div>
        {/if}

        <div class="space-y-5">
          <!-- Name -->
          <div>
            <label for="view-name" class="block text-sm font-medium mb-1.5" style="color: var(--color-foreground);">Name</label>
            <input id="view-name" type="text" bind:value={viewName} placeholder="e.g. Standup"
              class="w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none"
              style="border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-foreground); font-family: inherit;" />
          </div>

          <!-- Boards -->
          <div>
            <p class="text-sm font-medium mb-2" style="color: var(--color-foreground);">Boards</p>
            <div class="space-y-2">
              <label class="flex items-center gap-2.5 cursor-pointer">
                <input type="radio" bind:group={viewAllBoards} value={true} />
                <span class="text-sm" style="color: var(--color-foreground);">All boards</span>
              </label>
              <label class="flex items-center gap-2.5 cursor-pointer">
                <input type="radio" bind:group={viewAllBoards} value={false} />
                <span class="text-sm" style="color: var(--color-foreground);">Specific boards</span>
              </label>
            </div>
            {#if !viewAllBoards && org?.boards?.length}
              <div class="mt-2.5 space-y-1.5 pl-6">
                {#each org.boards as board}
                  <label class="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox"
                      checked={viewBoardIds.includes(board.id)}
                      on:change={() => toggleViewBoard(board.id)} />
                    <span class="text-sm" style="color: var(--color-foreground);">{board.name}</span>
                  </label>
                {/each}
              </div>
            {/if}
          </div>

          <!-- Column filter -->
          <div>
            <p class="text-sm font-medium mb-1" style="color: var(--color-foreground);">
              Column filter <span style="color: var(--color-secondary); font-weight: 400;">(optional)</span>
            </p>
            <p class="text-xs mb-2" style="color: var(--color-secondary);">Only show tasks in these columns. Leave empty to include all.</p>
            {#if viewColumnNames.length > 0}
              <div class="flex flex-wrap gap-1.5 mb-2">
                {#each viewColumnNames as name}
                  <span class="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
                    style="background: rgba(124,58,237,0.08); color: var(--color-accent);">
                    {name}
                    <button style="background: none; border: none; cursor: pointer; padding: 0; line-height: 1; color: inherit;"
                      on:click={() => viewColumnNames = viewColumnNames.filter(n => n !== name)}>×</button>
                  </span>
                {/each}
              </div>
            {/if}
            <div class="flex gap-2">
              <input type="text"
                bind:value={viewColumnInput}
                placeholder="e.g. In Progress"
                class="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none"
                style="border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-foreground); font-family: inherit;"
                on:keydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addViewColumn(); } }} />
              <button type="button"
                class="px-3 py-2 rounded-lg text-sm font-medium flex-shrink-0"
                style="background: rgba(124,58,237,0.08); color: var(--color-accent); border: none; cursor: pointer;"
                on:click={addViewColumn}>Add</button>
            </div>
          </div>

          <!-- Group by -->
          <div>
            <label for="view-group-by" class="block text-sm font-medium mb-1.5" style="color: var(--color-foreground);">Group by</label>
            <select id="view-group-by" bind:value={viewGroupBy}
              class="w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none"
              style="border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-foreground); font-family: inherit;">
              <option value="">None</option>
              <option value="assignee">Assignee</option>
              <option value="board">Board</option>
              <option value="priority">Priority</option>
              <option value="column">Column</option>
            </select>
          </div>

          <!-- Display as -->
          <div>
            <p class="text-sm font-medium mb-2" style="color: var(--color-foreground);">Display as</p>
            <div class="flex gap-2">
              {#each [['list', 'List'], ['kanban', 'Kanban']] as [type, label]}
                <button type="button"
                  class="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                  style="border: 1px solid {viewDisplayType === type ? 'var(--color-accent)' : 'var(--color-border)'}; background: {viewDisplayType === type ? 'rgba(124,58,237,0.08)' : 'transparent'}; color: {viewDisplayType === type ? 'var(--color-accent)' : 'var(--color-secondary)'}; cursor: pointer;"
                  on:click={() => viewDisplayType = type as "list" | "kanban"}>
                  {label}
                </button>
              {/each}
            </div>
          </div>

          <!-- Sort by -->
          <div>
            <label for="view-sort-field" class="block text-sm font-medium mb-1.5" style="color: var(--color-foreground);">Sort by</label>
            <div class="flex gap-2">
              <select id="view-sort-field" bind:value={viewSortField}
                class="flex-1 px-3 py-2.5 rounded-lg text-sm focus:outline-none"
                style="border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-foreground); font-family: inherit;">
                <option value="position">Position</option>
                <option value="priority">Priority</option>
                <option value="dueDate">Due date</option>
                <option value="createdAt">Created date</option>
              </select>
              <select bind:value={viewSortDirection}
                class="px-3 py-2.5 rounded-lg text-sm focus:outline-none"
                style="border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-foreground); font-family: inherit;">
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-6 pt-4" style="border-top: 1px solid var(--color-border);">
          <button type="button"
            class="px-4 py-2 rounded-lg text-sm font-medium"
            style="background: transparent; border: 1px solid var(--color-border); color: var(--color-secondary); cursor: pointer;"
            on:click={closeViewModal}>Cancel</button>
          <button type="button"
            disabled={viewSaving}
            class="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style="background: var(--color-accent); cursor: pointer; opacity: {viewSaving ? 0.6 : 1};"
            on:click={saveView}>
            {viewSaving ? 'Saving…' : (editingView ? 'Save changes' : 'Create view')}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
