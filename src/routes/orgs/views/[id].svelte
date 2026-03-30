<script lang="ts">
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import { auth } from "../../../stores/auth.store";
  import { getView, executeView, updateView, getOrg } from "../../../lib/api";

  export let params: { orgId: string; viewId: string } = { orgId: "", viewId: "" };

  type Task = {
    id: number;
    title: string;
    description: string | null;
    priority: number;
    dueDate: string | null;
    assignee: { id: number; name: string | null; email: string } | null;
    column: { id: number; name: string };
    board: { id: number; name: string };
  };

  type Group = { key: string; label: string; tasks: Task[] };
  type ViewResult =
    | { tasks: Task[]; groupBy: null }
    | { groups: Group[]; groupBy: string };

  let view: any = null;
  let org: any = null;
  let result: ViewResult | null = null;
  let myRole = "";
  let loading = true;
  let tasksLoading = false;
  let error: string | null = null;

  // Edit modal state
  let showEditModal = false;
  let editName = "";
  let editAllBoards = true;
  let editBoardIds: number[] = [];
  let editColumnNames: string[] = [];
  let editColumnInput = "";
  let editDisplayType: "list" | "kanban" = "list";
  let editGroupBy = "";
  let editSortField = "position";
  let editSortDirection: "asc" | "desc" = "asc";
  let editSaving = false;
  let editError: string | null = null;

  $: if ($auth.initialized && !$auth.token) push("/login");
  $: canManage = myRole === "OWNER" || myRole === "ADMIN";
  $: config = view?.config ?? {};
  $: isGrouped = result !== null && "groupBy" in result && result.groupBy !== null;
  $: displayType = (config.displayType ?? "list") as "list" | "kanban";

  function configBadges(cfg: any): string[] {
    const badges: string[] = [];
    if (cfg.boardIds?.length) {
      badges.push(`${cfg.boardIds.length} board${cfg.boardIds.length > 1 ? "s" : ""}`);
    } else {
      badges.push("All boards");
    }
    if (cfg.columnNames?.length) badges.push(cfg.columnNames.join(", "));
    if (cfg.groupBy) badges.push(`Grouped by ${cfg.groupBy}`);
    badges.push(cfg.displayType === "kanban" ? "Kanban" : "List");
    return badges;
  }

  function formatDate(d: string | null): string {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function groupInitial(label: string): string {
    return label.trim()[0]?.toUpperCase() ?? "?";
  }

  async function load() {
    loading = true;
    error = null;
    try {
      const [viewData, orgData] = await Promise.all([
        getView(params.orgId, params.viewId),
        getOrg(params.orgId),
      ]);
      view = viewData.view;
      org = orgData.org;
      myRole = orgData.role;
      result = await executeView(params.orgId, params.viewId);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  async function refreshTasks() {
    tasksLoading = true;
    try {
      result = await executeView(params.orgId, params.viewId);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      tasksLoading = false;
    }
  }

  function openEdit() {
    const cfg = view?.config ?? {};
    editName = view?.name ?? "";
    editAllBoards = !cfg.boardIds?.length;
    editBoardIds = cfg.boardIds ?? [];
    editColumnNames = cfg.columnNames ?? [];
    editColumnInput = "";
    editDisplayType = cfg.displayType ?? "list";
    editGroupBy = cfg.groupBy ?? "";
    editSortField = cfg.sortBy?.field ?? "position";
    editSortDirection = cfg.sortBy?.direction ?? "asc";
    editError = null;
    showEditModal = true;
  }

  function closeEdit() {
    showEditModal = false;
    editError = null;
  }

  function addEditColumn() {
    const name = editColumnInput.trim();
    if (name && !editColumnNames.includes(name)) {
      editColumnNames = [...editColumnNames, name];
    }
    editColumnInput = "";
  }

  function toggleEditBoard(boardId: number) {
    editBoardIds = editBoardIds.includes(boardId)
      ? editBoardIds.filter(id => id !== boardId)
      : [...editBoardIds, boardId];
  }

  async function saveEdit() {
    if (!editName.trim()) { editError = "Name is required."; return; }
    editSaving = true;
    editError = null;
    const newConfig = {
      boardIds: editAllBoards ? null : (editBoardIds.length ? editBoardIds : null),
      columnNames: editColumnNames.length ? editColumnNames : null,
      displayType: editDisplayType,
      groupBy: editGroupBy || null,
      sortBy: { field: editSortField, direction: editSortDirection },
    };
    try {
      const data = await updateView(params.orgId, params.viewId, {
        name: editName.trim(),
        config: newConfig,
      });
      view = data.view;
      closeEdit();
      await refreshTasks();
    } catch (e) {
      editError = e instanceof Error ? e.message : String(e);
    } finally {
      editSaving = false;
    }
  }

  onMount(load);
</script>

<style>
  .view-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  .view-header {
    padding: 18px 24px 14px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-card);
    flex-shrink: 0;
  }

  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--color-secondary);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    margin-bottom: 8px;
    transition: color 0.1s;
  }

  .back-btn:hover { color: var(--color-foreground); }

  .header-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }

  .view-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--color-foreground);
    letter-spacing: -0.2px;
    margin: 0;
  }

  .config-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 7px;
  }

  .config-badge {
    font-size: 11.5px;
    padding: 2px 9px;
    border-radius: 99px;
    background: rgba(124, 58, 237, 0.06);
    color: var(--color-accent);
    border: 1px solid rgba(124, 58, 237, 0.15);
  }

  .edit-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 7px;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-secondary);
    background: none;
    border: 1px solid var(--color-border);
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.1s, color 0.1s;
    flex-shrink: 0;
  }

  .edit-btn:hover {
    background: rgba(15, 23, 42, 0.04);
    color: var(--color-foreground);
  }

  /* List layout */
  .view-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
  }

  .content-inner {
    max-width: 760px;
  }

  .group-section {
    margin-bottom: 28px;
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 10px;
    margin-bottom: 10px;
    border-bottom: 1px solid var(--color-border);
  }

  .group-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--color-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 10px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .group-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-foreground);
    flex: 1;
  }

  .group-count {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-secondary);
    background: var(--color-bg);
    border-radius: 99px;
    padding: 1px 8px;
  }

  .task-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  /* Kanban layout */
  .kanban-area {
    flex: 1;
    display: flex;
    gap: 14px;
    padding: 20px 24px;
    overflow-x: auto;
    overflow-y: hidden;
    align-items: flex-start;
  }

  .kanban-column {
    flex-shrink: 0;
    width: 280px;
    background: var(--color-card);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: calc(100vh - 140px);
    overflow-y: auto;
  }

  .kanban-col-header {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    margin-bottom: 4px;
  }

  .kanban-col-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-foreground);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .kanban-count {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-secondary);
    background: var(--color-bg);
    border-radius: 99px;
    padding: 1px 7px;
    flex-shrink: 0;
  }

  /* Task card */
  .task-card {
    background: var(--color-card);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 11px 13px;
    transition: box-shadow 0.15s;
  }

  .task-card:hover {
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
  }

  .task-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-foreground);
    line-height: 1.4;
    margin-bottom: 2px;
  }

  .task-desc {
    font-size: 12px;
    color: var(--color-secondary);
    line-height: 1.4;
    margin-bottom: 8px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .task-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px;
    margin-top: 8px;
  }

  .meta-badge {
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 99px;
    background: var(--color-bg);
    color: var(--color-secondary);
    border: 1px solid var(--color-border);
    white-space: nowrap;
  }

  .meta-badge.accent {
    background: rgba(124, 58, 237, 0.06);
    color: var(--color-accent);
    border-color: rgba(124, 58, 237, 0.15);
  }

  .empty-group {
    font-size: 12px;
    color: var(--color-secondary);
    padding: 8px 0;
    text-align: center;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 0;
    text-align: center;
  }

  .empty-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: rgba(124, 58, 237, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 14px;
  }
</style>

{#if loading}
  <div class="flex items-center justify-center h-screen" style="color: var(--color-secondary); font-size: 14px;">
    Loading…
  </div>

{:else if error && !view}
  <div class="p-8">
    <div class="max-w-lg mx-auto">
      <button class="back-btn mb-4" on:click={() => push(`/orgs/${params.orgId}`)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Organizations
      </button>
      <div class="px-4 py-3 rounded-lg text-sm" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;">{error}</div>
    </div>
  </div>

{:else if view}
  <div class="view-container">

    <!-- Header -->
    <header class="view-header">
      <button class="back-btn" on:click={() => push(`/orgs/${params.orgId}`)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        {org?.name ?? "Organization"}
      </button>

      <div class="header-row">
        <div style="min-width: 0;">
          <h1 class="view-title">{view.name}</h1>
          <div class="config-badges">
            {#each configBadges(config) as badge}
              <span class="config-badge">{badge}</span>
            {/each}
          </div>
        </div>

        {#if canManage}
          <button class="edit-btn" on:click={openEdit}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit view
          </button>
        {/if}
      </div>
    </header>

    <!-- Content -->
    {#if tasksLoading}
      <div class="flex items-center justify-center" style="flex: 1; color: var(--color-secondary); font-size: 14px;">
        Loading tasks…
      </div>

    {:else if result === null}
      <div class="flex items-center justify-center" style="flex: 1; color: var(--color-secondary); font-size: 14px;">
        No data
      </div>

    {:else if displayType === "kanban" && isGrouped}
      <!-- Kanban: each group is a column -->
      <div class="kanban-area">
        {#each (result as { groups: Group[]; groupBy: string }).groups as group}
          <div class="kanban-column">
            <div class="kanban-col-header">
              <div class="group-avatar">{groupInitial(group.label)}</div>
              <span class="kanban-col-name">{group.label}</span>
              <span class="kanban-count">{group.tasks.length}</span>
            </div>

            {#if group.tasks.length === 0}
              <p class="empty-group">No tasks</p>
            {:else}
              {#each group.tasks as task (task.id)}
                <div class="task-card">
                  <p class="task-title">{task.title}</p>
                  {#if task.description}
                    <p class="task-desc">{task.description}</p>
                  {/if}
                  <div class="task-meta">
                    <span class="meta-badge">{task.board.name}</span>
                    <span class="meta-badge">{task.column.name}</span>
                    {#if task.assignee}
                      <span class="meta-badge accent">{task.assignee.name ?? task.assignee.email}</span>
                    {/if}
                    {#if task.dueDate}
                      <span class="meta-badge">Due {formatDate(task.dueDate)}</span>
                    {/if}
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        {/each}

        {#if (result as { groups: Group[] }).groups.length === 0}
          <div style="padding: 48px; color: var(--color-secondary); font-size: 14px;">No tasks match this view.</div>
        {/if}
      </div>

    {:else if isGrouped}
      <!-- List with group sections -->
      <div class="view-content">
        <div class="content-inner">
          {#each (result as { groups: Group[]; groupBy: string }).groups as group}
            <div class="group-section">
              <div class="group-header">
                <div class="group-avatar">{groupInitial(group.label)}</div>
                <span class="group-label">{group.label}</span>
                <span class="group-count">{group.tasks.length}</span>
              </div>

              {#if group.tasks.length === 0}
                <p style="font-size: 13px; color: var(--color-secondary); padding: 4px 0;">No tasks in this group.</p>
              {:else}
                <div class="task-list">
                  {#each group.tasks as task (task.id)}
                    <div class="task-card">
                      <p class="task-title">{task.title}</p>
                      {#if task.description}
                        <p class="task-desc">{task.description}</p>
                      {/if}
                      <div class="task-meta">
                        <span class="meta-badge">{task.board.name}</span>
                        <span class="meta-badge">{task.column.name}</span>
                        {#if task.assignee}
                          <span class="meta-badge accent">{task.assignee.name ?? task.assignee.email}</span>
                        {/if}
                        {#if task.dueDate}
                          <span class="meta-badge">Due {formatDate(task.dueDate)}</span>
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}

          {#if (result as { groups: Group[] }).groups.length === 0}
            <div class="empty-state">
              <div class="empty-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--color-accent);" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
              <p class="text-sm font-medium mb-1" style="color: var(--color-foreground);">No tasks found</p>
              <p class="text-sm" style="color: var(--color-secondary);">Try adjusting the view filters.</p>
            </div>
          {/if}
        </div>
      </div>

    {:else}
      <!-- Flat list (no grouping) -->
      <div class="view-content">
        <div class="content-inner">
          {#if (result as { tasks: Task[] }).tasks.length === 0}
            <div class="empty-state">
              <div class="empty-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--color-accent);" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
              <p class="text-sm font-medium mb-1" style="color: var(--color-foreground);">No tasks found</p>
              <p class="text-sm" style="color: var(--color-secondary);">Try adjusting the view filters.</p>
            </div>
          {:else}
            <div class="task-list">
              {#each (result as { tasks: Task[] }).tasks as task (task.id)}
                <div class="task-card">
                  <p class="task-title">{task.title}</p>
                  {#if task.description}
                    <p class="task-desc">{task.description}</p>
                  {/if}
                  <div class="task-meta">
                    <span class="meta-badge">{task.board.name}</span>
                    <span class="meta-badge">{task.column.name}</span>
                    {#if task.assignee}
                      <span class="meta-badge accent">{task.assignee.name ?? task.assignee.email}</span>
                    {/if}
                    {#if task.dueDate}
                      <span class="meta-badge">Due {formatDate(task.dueDate)}</span>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}

  </div>
{/if}

<!-- Edit view modal -->
{#if showEditModal && canManage}
  <div class="fixed inset-0 z-40 flex items-center justify-center">
    <button type="button" class="absolute inset-0 bg-black/40 border-0 p-0 m-0 focus:outline-none"
      aria-label="Close" on:click={closeEdit}></button>
    <div class="relative rounded-xl shadow-xl w-full max-w-lg mx-4"
      role="dialog" aria-modal="true"
      style="background: var(--color-card); border: 1px solid var(--color-border); max-height: 90vh; display: flex; flex-direction: column;">
      <div class="p-6 overflow-y-auto">
        <h2 class="text-base font-semibold mb-5" style="color: var(--color-foreground);">Edit view</h2>

        {#if editError}
          <div class="px-3 py-2 rounded-lg text-sm mb-4" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;">{editError}</div>
        {/if}

        <div class="space-y-5">
          <!-- Name -->
          <div>
            <label for="edit-name" class="block text-sm font-medium mb-1.5" style="color: var(--color-foreground);">Name</label>
            <input id="edit-name" type="text" bind:value={editName} placeholder="e.g. Standup"
              class="w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none"
              style="border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-foreground); font-family: inherit;" />
          </div>

          <!-- Boards -->
          <div>
            <p class="text-sm font-medium mb-2" style="color: var(--color-foreground);">Boards</p>
            <div class="space-y-2">
              <label class="flex items-center gap-2.5 cursor-pointer">
                <input type="radio" bind:group={editAllBoards} value={true} />
                <span class="text-sm" style="color: var(--color-foreground);">All boards</span>
              </label>
              <label class="flex items-center gap-2.5 cursor-pointer">
                <input type="radio" bind:group={editAllBoards} value={false} />
                <span class="text-sm" style="color: var(--color-foreground);">Specific boards</span>
              </label>
            </div>
            {#if !editAllBoards && org?.boards?.length}
              <div class="mt-2.5 space-y-1.5 pl-6">
                {#each org.boards as board}
                  <label class="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox"
                      checked={editBoardIds.includes(board.id)}
                      on:change={() => toggleEditBoard(board.id)} />
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
            {#if editColumnNames.length > 0}
              <div class="flex flex-wrap gap-1.5 mb-2">
                {#each editColumnNames as name}
                  <span class="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
                    style="background: rgba(124,58,237,0.08); color: var(--color-accent);">
                    {name}
                    <button style="background: none; border: none; cursor: pointer; padding: 0; line-height: 1; color: inherit;"
                      on:click={() => editColumnNames = editColumnNames.filter(n => n !== name)}>×</button>
                  </span>
                {/each}
              </div>
            {/if}
            <div class="flex gap-2">
              <input type="text"
                bind:value={editColumnInput}
                placeholder="e.g. In Progress"
                class="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none"
                style="border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-foreground); font-family: inherit;"
                on:keydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEditColumn(); } }} />
              <button type="button"
                class="px-3 py-2 rounded-lg text-sm font-medium flex-shrink-0"
                style="background: rgba(124,58,237,0.08); color: var(--color-accent); border: none; cursor: pointer;"
                on:click={addEditColumn}>Add</button>
            </div>
          </div>

          <!-- Group by -->
          <div>
            <label for="edit-group-by" class="block text-sm font-medium mb-1.5" style="color: var(--color-foreground);">Group by</label>
            <select id="edit-group-by" bind:value={editGroupBy}
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
                  style="border: 1px solid {editDisplayType === type ? 'var(--color-accent)' : 'var(--color-border)'}; background: {editDisplayType === type ? 'rgba(124,58,237,0.08)' : 'transparent'}; color: {editDisplayType === type ? 'var(--color-accent)' : 'var(--color-secondary)'}; cursor: pointer;"
                  on:click={() => editDisplayType = type as "list" | "kanban"}>
                  {label}
                </button>
              {/each}
            </div>
          </div>

          <!-- Sort by -->
          <div>
            <label for="edit-sort-field" class="block text-sm font-medium mb-1.5" style="color: var(--color-foreground);">Sort by</label>
            <div class="flex gap-2">
              <select id="edit-sort-field" bind:value={editSortField}
                class="flex-1 px-3 py-2.5 rounded-lg text-sm focus:outline-none"
                style="border: 1px solid var(--color-border); background: var(--color-bg); color: var(--color-foreground); font-family: inherit;">
                <option value="position">Position</option>
                <option value="priority">Priority</option>
                <option value="dueDate">Due date</option>
                <option value="createdAt">Created date</option>
              </select>
              <select bind:value={editSortDirection}
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
            on:click={closeEdit}>Cancel</button>
          <button type="button"
            disabled={editSaving}
            class="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style="background: var(--color-accent); cursor: pointer; opacity: {editSaving ? 0.6 : 1};"
            on:click={saveEdit}>
            {editSaving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

{#if error && view}
  <div style="position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #1e293b; color: #f8fafc; padding: 10px 16px; border-radius: 8px; font-size: 13px; z-index: 200; box-shadow: 0 4px 16px rgba(0,0,0,0.2); display: flex; align-items: center; gap: 10px;">
    {error}
    <button style="background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 16px; line-height: 1;" on:click={() => error = null}>×</button>
  </div>
{/if}
