<script lang="ts">
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import { auth } from "../stores/auth.store";
  import { listOrgs, listViews, getOrg, createView } from "../lib/api";

  type ViewEntry = {
    id: number;
    name: string;
    config: any;
    orgId: number;
    orgName: string;
    createdAt: string;
  };

  type Org = { id: number; name: string };
  type Board = { id: number; name: string };

  let views: ViewEntry[] = [];
  let orgs: Org[] = [];
  let loading = true;
  let error: string | null = null;
  let filter: number | "all" = "all";

  // Create modal
  let showModal = false;
  let modalOrgId: number | null = null;
  let modalBoards: Board[] = [];
  let boardsLoading = false;
  let viewName = "";
  let viewAllBoards = true;
  let viewBoardIds: number[] = [];
  let viewColumnNames: string[] = [];
  let viewColumnInput = "";
  let viewDisplayType: "list" | "kanban" = "list";
  let viewGroupBy = "";
  let viewSortField = "position";
  let viewSortDirection: "asc" | "desc" = "asc";
  let saving = false;
  let modalError: string | null = null;

  $: if ($auth.initialized && !$auth.token) push("/login");
  $: filteredViews = filter === "all" ? views : views.filter(v => v.orgId === filter);
  $: canCreate = orgs.length > 0;

  function groupByLabel(cfg: any): string {
    if (!cfg?.groupBy) return "";
    return `Grouped by ${cfg.groupBy}`;
  }

  function columnLabel(cfg: any): string {
    if (!cfg?.columnNames?.length) return "";
    return cfg.columnNames.join(", ");
  }

  async function load() {
    loading = true;
    error = null;
    try {
      const { orgs: fetchedOrgs } = await listOrgs();
      orgs = fetchedOrgs;

      const results = await Promise.all(
        fetchedOrgs.map(async (org: Org) => {
          try {
            const { views: orgViews } = await listViews(org.id);
            return orgViews.map((v: any) => ({ ...v, orgId: org.id, orgName: org.name }));
          } catch {
            return [];
          }
        })
      );

      views = results.flat().sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  function openModal() {
    modalOrgId = orgs.length === 1 ? orgs[0].id : null;
    modalBoards = [];
    viewName = "";
    viewAllBoards = true;
    viewBoardIds = [];
    viewColumnNames = [];
    viewColumnInput = "";
    viewDisplayType = "list";
    viewGroupBy = "";
    viewSortField = "position";
    viewSortDirection = "asc";
    modalError = null;
    showModal = true;
    if (modalOrgId) loadOrgBoards(modalOrgId);
  }

  function closeModal() {
    showModal = false;
    modalError = null;
  }

  async function loadOrgBoards(orgId: number) {
    boardsLoading = true;
    modalBoards = [];
    viewBoardIds = [];
    try {
      const data = await getOrg(orgId);
      modalBoards = data.org.boards ?? [];
    } catch {
      modalBoards = [];
    } finally {
      boardsLoading = false;
    }
  }

  function handleOrgChange(e: Event) {
    const id = Number((e.target as HTMLSelectElement).value);
    modalOrgId = id || null;
    viewAllBoards = true;
    if (modalOrgId) loadOrgBoards(modalOrgId);
  }

  function addColumn() {
    const name = viewColumnInput.trim();
    if (name && !viewColumnNames.includes(name)) {
      viewColumnNames = [...viewColumnNames, name];
    }
    viewColumnInput = "";
  }

  function toggleBoard(boardId: number) {
    viewBoardIds = viewBoardIds.includes(boardId)
      ? viewBoardIds.filter(id => id !== boardId)
      : [...viewBoardIds, boardId];
  }

  async function handleCreate() {
    if (!viewName.trim()) { modalError = "Name is required."; return; }
    if (!modalOrgId) { modalError = "Select an organization."; return; }

    saving = true;
    modalError = null;
    const config = {
      boardIds: viewAllBoards ? null : (viewBoardIds.length ? viewBoardIds : null),
      columnNames: viewColumnNames.length ? viewColumnNames : null,
      displayType: viewDisplayType,
      groupBy: viewGroupBy || null,
      sortBy: { field: viewSortField, direction: viewSortDirection },
    };
    try {
      const data = await createView(modalOrgId, viewName.trim(), config);
      const org = orgs.find(o => o.id === modalOrgId);
      const newEntry: ViewEntry = {
        ...data.view,
        orgId: modalOrgId,
        orgName: org?.name ?? "",
      };
      views = [newEntry, ...views];
      closeModal();
      push(`/orgs/${modalOrgId}/views/${data.view.id}`);
    } catch (e) {
      modalError = e instanceof Error ? e.message : String(e);
    } finally {
      saving = false;
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && showModal) closeModal();
  }

  onMount(load);
</script>

<svelte:window on:keydown={onKeyDown} />

<section class="min-h-screen p-8">
  <div class="max-w-6xl mx-auto">
    <div class="mb-8">
      <h1 class="text-xl font-semibold" style="color: var(--color-foreground); letter-spacing: -0.3px;">Views</h1>
      <p class="text-sm mt-0.5" style="color: var(--color-secondary);">Custom layouts across your organization boards.</p>
    </div>

    <div class="flex items-center justify-between mb-6">
      <div>
        {#if orgs.length > 1}
          <select
            class="text-sm px-3 py-2 rounded-lg focus:outline-none cursor-pointer"
            style="border: 1px solid var(--color-border); background: var(--color-card); color: var(--color-foreground);"
            value={filter}
            on:change={(e) => {
              const v = (e.target as HTMLSelectElement).value;
              filter = v === "all" ? "all" : Number(v);
            }}>
            <option value="all">All organizations</option>
            {#each orgs as org}
              <option value={org.id}>{org.name}</option>
            {/each}
          </select>
        {/if}
      </div>

      {#if canCreate}
        <button
          class="px-3.5 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2"
          style="background: var(--color-accent);"
          on:click={openModal}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          New view
        </button>
      {/if}
    </div>

    {#if loading}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each [1, 2, 3] as _}
          <div class="h-24 rounded-xl animate-pulse" style="background: var(--color-border);"></div>
        {/each}
      </div>

    {:else if error}
      <div class="px-4 py-3 rounded-lg text-sm" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;">{error}</div>

    {:else if filteredViews.length === 0}
      <div class="flex flex-col items-center justify-center py-20 text-center">
        <div class="w-10 h-10 rounded-xl mb-4 flex items-center justify-center" style="background: rgba(124,58,237,0.08);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--color-accent);" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </div>
        <p class="font-medium text-sm mb-1" style="color: var(--color-foreground);">No views yet</p>
        <p class="text-sm" style="color: var(--color-secondary);">
          {#if orgs.length === 0}
            Create an organization first, then add views to it.
          {:else}
            Create a view to save a custom layout of your tasks.
          {/if}
        </p>
        {#if canCreate}
          <button
            class="mt-4 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style="background: var(--color-accent); border: none; cursor: pointer;"
            on:click={openModal}>
            New view
          </button>
        {:else if orgs.length === 0}
          <button
            class="mt-4 px-4 py-2 rounded-lg text-sm font-medium"
            style="background: rgba(124,58,237,0.08); color: var(--color-accent); border: none; cursor: pointer;"
            on:click={() => push("/orgs")}>
            Go to organizations
          </button>
        {/if}
      </div>

    {:else}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each filteredViews as view}
          <button
            class="rounded-xl p-5 text-left transition-shadow hover:shadow-md"
            style="background: var(--color-card); border: 1px solid var(--color-border); cursor: pointer; width: 100%;"
            on:click={() => push(`/orgs/${view.orgId}/views/${view.id}`)}>
            <div class="flex items-start justify-between gap-2 mb-3">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background: rgba(124,58,237,0.08);">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-accent);" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
              <span class="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                style="background: rgba(124,58,237,0.06); color: var(--color-accent); border: 1px solid rgba(124,58,237,0.15);">
                {view.orgName}
              </span>
            </div>
            <h3 class="font-semibold text-sm mb-1" style="color: var(--color-foreground);">{view.name}</h3>
            <p class="text-xs leading-relaxed" style="color: var(--color-secondary);">
              {#if groupByLabel(view.config) && columnLabel(view.config)}
                {columnLabel(view.config)} · {groupByLabel(view.config)}
              {:else if groupByLabel(view.config)}
                {groupByLabel(view.config)}
              {:else if columnLabel(view.config)}
                {columnLabel(view.config)}
              {:else}
                No filters
              {/if}
            </p>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</section>

{#if showModal}
  <div class="fixed inset-0 z-40 flex items-center justify-center">
    <button type="button" class="absolute inset-0 bg-black/40 border-0 p-0 m-0 focus:outline-none"
      aria-label="Close" on:click={closeModal}></button>
    <div class="relative rounded-xl shadow-xl w-full max-w-lg mx-4"
      role="dialog" aria-modal="true"
      style="background: var(--color-card); border: 1px solid var(--color-border); max-height: 90vh; display: flex; flex-direction: column;">
      <div class="p-6 overflow-y-auto">
        <h2 class="text-base font-semibold mb-5" style="color: var(--color-foreground);">New view</h2>

        {#if modalError}
          <div class="px-3 py-2 rounded-lg text-sm mb-4" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;">{modalError}</div>
        {/if}

        <div class="space-y-5">
          <!-- Organization -->
          <div>
            <label for="view-org" class="block text-sm font-medium mb-1.5" style="color: var(--color-foreground);">Organization</label>
            <select id="view-org"
              class="w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none"
              style="border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-foreground); font-family: inherit;"
              value={modalOrgId ?? ""}
              on:change={handleOrgChange}>
              <option value="" disabled>Select an organization…</option>
              {#each orgs as org}
                <option value={org.id}>{org.name}</option>
              {/each}
            </select>
          </div>

          <!-- Name -->
          <div>
            <label for="view-name" class="block text-sm font-medium mb-1.5" style="color: var(--color-foreground);">Name</label>
            <input id="view-name" type="text" bind:value={viewName} placeholder="e.g. Standup"
              class="w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none"
              style="border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-foreground); font-family: inherit;" />
          </div>

          <!-- Boards -->
          {#if modalOrgId}
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
              {#if !viewAllBoards}
                <div class="mt-2.5 pl-6">
                  {#if boardsLoading}
                    <p class="text-sm" style="color: var(--color-secondary);">Loading boards…</p>
                  {:else if modalBoards.length === 0}
                    <p class="text-sm" style="color: var(--color-secondary);">No boards in this organization.</p>
                  {:else}
                    <div class="space-y-1.5">
                      {#each modalBoards as board}
                        <label class="flex items-center gap-2.5 cursor-pointer">
                          <input type="checkbox"
                            checked={viewBoardIds.includes(board.id)}
                            on:change={() => toggleBoard(board.id)} />
                          <span class="text-sm" style="color: var(--color-foreground);">{board.name}</span>
                        </label>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          {/if}

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
                on:keydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addColumn(); } }} />
              <button type="button"
                class="px-3 py-2 rounded-lg text-sm font-medium flex-shrink-0"
                style="background: rgba(124,58,237,0.08); color: var(--color-accent); border: none; cursor: pointer;"
                on:click={addColumn}>Add</button>
            </div>
          </div>

          <!-- Group by -->
          <div>
            <label for="view-group" class="block text-sm font-medium mb-1.5" style="color: var(--color-foreground);">Group by</label>
            <select id="view-group" bind:value={viewGroupBy}
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
            <label for="view-sort" class="block text-sm font-medium mb-1.5" style="color: var(--color-foreground);">Sort by</label>
            <div class="flex gap-2">
              <select id="view-sort" bind:value={viewSortField}
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
            on:click={closeModal}>Cancel</button>
          <button type="button"
            disabled={saving}
            class="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style="background: var(--color-accent); cursor: pointer; opacity: {saving ? 0.6 : 1};"
            on:click={handleCreate}>
            {saving ? 'Creating…' : 'Create view'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
