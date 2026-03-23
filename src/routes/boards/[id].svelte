<script lang="ts">
  import { onMount } from "svelte";
  import { params } from "svelte-spa-router";
  import { push } from "svelte-spa-router";
  import {
    getBoard,
    createColumn,
    createTask,
    deleteTask,
    deleteColumn,
    updateColumn,
    moveTask,
  } from "../../lib/api";

  let loading = true;
  let error: string | null = null;
  let board: any = null;

  let editingColumnId: number | null = null;
  let editingColumnName: string = "";
  let editInputRef: HTMLInputElement;

  let draggedTask: any = null;
  let draggedFromColumnId: number | null = null;
  let dropIndicatorPosition: { columnId: number; position: number } | null = null;

  let showTaskModal = false;
  let taskModalColumnId: number | null = null;
  let taskModalTitle = "";
  let taskModalDescription = "";

  let showColumnModal = false;
  let columnModalTitle = "";

  // inline delete confirmation
  let confirmDeleteColumnId: number | null = null;

  onMount(() => {
    if ($params?.id) load($params.id);
  });

  $: if ($params?.id) load($params.id);

  async function load(id: string | number) {
    loading = true;
    error = null;
    try {
      const { board: b } = await getBoard(id);
      board = b;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  function openColumnModal() {
    showColumnModal = true;
    columnModalTitle = "";
  }

  async function submitColumn() {
    if (!columnModalTitle.trim()) { closeColumnModal(); return; }
    try {
      const { column } = await createColumn(board.id, columnModalTitle.trim());
      board.columns = [...board.columns, { ...column, tasks: [] }];
      board = board;
      closeColumnModal();
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }

  function closeColumnModal() { showColumnModal = false; }

  function openEditColumn(columnId: number, columnName: string) {
    editingColumnId = columnId;
    editingColumnName = columnName;
    confirmDeleteColumnId = null;
    setTimeout(() => editInputRef?.focus(), 0);
  }

  async function saveEditColumn() {
    if (!editingColumnName.trim() || !editingColumnId) { closeEditColumn(); return; }
    try {
      await updateColumn(editingColumnId, { name: editingColumnName.trim() });
      const col = board.columns.find((c: any) => c.id === editingColumnId);
      if (col) { col.name = editingColumnName.trim(); board = board; }
      closeEditColumn();
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      closeEditColumn();
    }
  }

  function closeEditColumn() { editingColumnId = null; editingColumnName = ""; }

  function openTaskModal(columnId: number) {
    taskModalColumnId = columnId;
    taskModalTitle = "";
    taskModalDescription = "";
    showTaskModal = true;
  }

  async function submitTask() {
    if (!taskModalTitle.trim() || !taskModalColumnId) { closeTaskModal(); return; }
    try {
      const { task } = await createTask(taskModalColumnId, taskModalTitle.trim(), taskModalDescription.trim());
      const column = board.columns.find((c: any) => c.id === taskModalColumnId);
      if (column) { column.tasks = [...column.tasks, task]; board = board; }
      closeTaskModal();
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }

  function closeTaskModal() { showTaskModal = false; }

  async function deleteTaskHandler(taskId: number) {
    const columnWithTask = board.columns.find((col: any) =>
      col.tasks.some((t: any) => t.id === taskId)
    );
    if (columnWithTask) {
      columnWithTask.tasks = columnWithTask.tasks.filter((t: any) => t.id !== taskId);
      board = board;
    }
    try {
      await deleteTask(taskId);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      await load(board.id);
    }
  }

  async function deleteColumnHandler(columnId: number) {
    confirmDeleteColumnId = null;
    board.columns = board.columns.filter((col: any) => col.id !== columnId);
    board = board;
    try {
      await deleteColumn(columnId);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      await load(board.id);
    }
  }

  function handleDragStart(e: DragEvent, task: any, columnId: number) {
    draggedTask = task;
    draggedFromColumnId = columnId;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", task.id);
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  }

  function handleDragOverTask(e: DragEvent, columnId: number, taskIndex: number) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    dropIndicatorPosition = { columnId, position: taskIndex };
  }

  function handleDragLeave(e: DragEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
      dropIndicatorPosition = null;
    }
  }

  async function handleDropOnColumn(e: DragEvent, columnId: number) {
    e.preventDefault();
    if (!draggedTask || draggedFromColumnId === null) {
      draggedTask = null; draggedFromColumnId = null; dropIndicatorPosition = null;
      return;
    }
    try {
      let position = dropIndicatorPosition?.position ?? board.columns.find((c: any) => c.id === columnId)?.tasks?.length ?? 0;
      if (draggedFromColumnId === columnId) {
        const sourceColumn = board.columns.find((c: any) => c.id === columnId);
        const currentTaskIndex = sourceColumn?.tasks?.findIndex((t: any) => t.id === draggedTask.id) ?? -1;
        if (currentTaskIndex >= 0 && position > currentTaskIndex) position = position - 1;
      }
      const fromColumn = board.columns.find((c: any) => c.id === draggedFromColumnId);
      const toColumn = board.columns.find((c: any) => c.id === columnId);
      if (fromColumn && toColumn) {
        fromColumn.tasks = fromColumn.tasks.filter((t: any) => t.id !== draggedTask.id);
        toColumn.tasks = [...toColumn.tasks.slice(0, position), draggedTask, ...toColumn.tasks.slice(position)];
        board = board;
      }
      await moveTask(draggedTask.id, columnId, position);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      await load(board.id);
    } finally {
      draggedTask = null; draggedFromColumnId = null; dropIndicatorPosition = null;
    }
  }
</script>

<style>
  .board-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  .board-header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-card);
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }

  .back-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--color-secondary);
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 0;
    transition: color 0.1s;
  }

  .back-btn:hover { color: var(--color-foreground); }

  .board-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--color-foreground);
    letter-spacing: -0.2px;
  }

  .columns-area {
    display: flex;
    gap: 14px;
    padding: 20px 24px;
    overflow-x: auto;
    align-items: flex-start;
    flex: 1;
  }

  .column {
    background: var(--color-card);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    padding: 14px;
    flex-shrink: 0;
    width: 280px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .column-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .column-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-foreground);
    flex: 1;
    min-width: 0;
  }

  .column-count {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-secondary);
    background: var(--color-bg);
    border-radius: 99px;
    padding: 1px 7px;
    flex-shrink: 0;
  }

  .col-btn {
    padding: 4px;
    border-radius: 5px;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--color-secondary);
    display: flex;
    align-items: center;
    transition: background 0.1s, color 0.1s;
    flex-shrink: 0;
  }

  .col-btn:hover { background: var(--color-bg); color: var(--color-foreground); }
  .col-btn.danger:hover { background: #fef2f2; color: #dc2626; }

  .column-edit-input {
    width: 100%;
    font-size: 13px;
    font-weight: 600;
    background: var(--color-bg);
    border: 1px solid var(--color-accent);
    border-radius: 6px;
    padding: 3px 8px;
    color: var(--color-foreground);
    outline: none;
  }

  .delete-confirm {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 6px;
    font-size: 12px;
    color: #dc2626;
  }

  .delete-confirm button {
    border: none;
    background: none;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
  }

  .delete-confirm .confirm-yes {
    color: white;
    background: #dc2626;
  }

  .delete-confirm .confirm-no {
    color: var(--color-secondary);
  }

  .tasks-list { display: flex; flex-direction: column; gap: 6px; }

  .drop-line {
    height: 2px;
    border-radius: 2px;
    background: var(--color-accent);
    margin: 2px 0;
  }

  .task-card {
    background: var(--color-card);
    border: 1px solid var(--color-border);
    border-radius: 7px;
    padding: 10px 12px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    cursor: grab;
    transition: box-shadow 0.15s, border-color 0.15s;
  }

  .task-card:hover {
    box-shadow: 0 2px 8px rgba(15,23,42,0.08);
    border-color: #cbd5e1;
  }

  .task-card:active { cursor: grabbing; }

  .task-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-foreground);
    line-height: 1.4;
  }

  .task-desc {
    font-size: 12px;
    color: var(--color-secondary);
    margin-top: 3px;
    line-height: 1.4;
  }

  .task-delete {
    padding: 2px 4px;
    border-radius: 4px;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--color-secondary);
    opacity: 0;
    transition: opacity 0.1s, color 0.1s;
    flex-shrink: 0;
    margin-left: 6px;
    font-size: 14px;
    line-height: 1;
  }

  .task-card:hover .task-delete { opacity: 1; }
  .task-delete:hover { color: #dc2626; }

  .task-inline-form {
    background: var(--color-bg);
    border: 1px solid var(--color-accent);
    border-radius: 7px;
    padding: 10px 12px;
  }

  .task-inline-form input,
  .task-inline-form textarea {
    width: 100%;
    background: transparent;
    border: none;
    outline: none;
    font-size: 13px;
    font-family: inherit;
    color: var(--color-foreground);
    resize: none;
  }

  .task-inline-form input { font-weight: 500; margin-bottom: 4px; }
  .task-inline-form textarea { color: var(--color-secondary); font-size: 12px; }

  .add-task-btn {
    width: 100%;
    padding: 7px 10px;
    border-radius: 6px;
    border: 1px dashed var(--color-border);
    background: none;
    cursor: pointer;
    font-size: 12.5px;
    font-weight: 500;
    color: var(--color-secondary);
    display: flex;
    align-items: center;
    gap: 6px;
    transition: background 0.1s, border-color 0.1s, color 0.1s;
  }

  .add-task-btn:hover {
    background: rgba(124,58,237,0.04);
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  .add-column-btn {
    flex-shrink: 0;
    width: 280px;
    min-height: 80px;
    border-radius: 10px;
    border: 1px dashed var(--color-border);
    background: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-secondary);
    transition: background 0.1s, border-color 0.1s, color 0.1s;
  }

  .add-column-btn:hover {
    background: rgba(124,58,237,0.04);
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  .column-inline-form {
    flex-shrink: 0;
    width: 280px;
    background: var(--color-card);
    border: 1px solid var(--color-accent);
    border-radius: 10px;
    padding: 14px;
  }

  .column-inline-form input {
    width: 100%;
    font-size: 13px;
    font-weight: 600;
    background: transparent;
    border: none;
    outline: none;
    font-family: inherit;
    color: var(--color-foreground);
  }

  .error-bar {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: #1e293b;
    color: #f8fafc;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 13px;
    z-index: 200;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .error-bar button {
    background: none;
    border: none;
    cursor: pointer;
    color: #94a3b8;
    font-size: 16px;
    line-height: 1;
  }
</style>

{#if loading}
  <div class="flex items-center justify-center h-screen" style="color: var(--color-secondary); font-size: 14px;">
    Loading…
  </div>
{:else if !board}
  <div class="flex items-center justify-center h-screen" style="color: #dc2626; font-size: 14px;">
    {error ?? "Board not found"}
  </div>
{:else}
  <div class="board-container">
    <header class="board-header">
      <button class="back-btn" on:click={() => push('/boards')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Boards
      </button>
      <span style="color: var(--color-border);">/</span>
      <h1 class="board-title">{board.name}</h1>
    </header>

    <div class="columns-area">
      {#each board.columns as column (column.id)}
        <div class="column"
          role="region"
          on:dragover={handleDragOver}
          on:drop={(e) => handleDropOnColumn(e, column.id)}>

          <div class="column-header">
            {#if editingColumnId === column.id}
              <input
                type="text"
                bind:value={editingColumnName}
                bind:this={editInputRef}
                class="column-edit-input"
                on:keydown={(e) => {
                  if (e.key === 'Enter') saveEditColumn();
                  if (e.key === 'Escape') closeEditColumn();
                }}
                on:focusout={saveEditColumn} />
            {:else}
              <span class="column-name" title={column.name}>{column.name}</span>
              <span class="column-count">{column.tasks.length}</span>
              <button class="col-btn" title="Rename" on:click={() => openEditColumn(column.id, column.name)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button class="col-btn danger" title="Delete column"
                on:click={() => confirmDeleteColumnId = column.id}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                </svg>
              </button>
            {/if}
          </div>

          {#if confirmDeleteColumnId === column.id}
            <div class="delete-confirm">
              <span style="flex:1;">Delete "{column.name}"?</span>
              <button class="confirm-yes" on:click={() => deleteColumnHandler(column.id)}>Delete</button>
              <button class="confirm-no" on:click={() => confirmDeleteColumnId = null}>Cancel</button>
            </div>
          {/if}

          <div class="tasks-list" role="region" on:dragleave={handleDragLeave}>
            {#each column.tasks as task, index (task.id)}
              {#if dropIndicatorPosition?.columnId === column.id && dropIndicatorPosition?.position === index}
                <div class="drop-line"></div>
              {/if}
              <div class="task-card"
                role="button"
                tabindex="0"
                draggable="true"
                on:dragstart={(e) => handleDragStart(e, task, column.id)}
                on:dragover={(e) => handleDragOverTask(e, column.id, index)}>
                <div style="flex:1; min-width:0;">
                  <p class="task-title">{task.title}</p>
                  {#if task.description}
                    <p class="task-desc">{task.description}</p>
                  {/if}
                </div>
                <button class="task-delete" on:click={() => deleteTaskHandler(task.id)} title="Delete task">×</button>
              </div>
              {#if index === column.tasks.length - 1 && dropIndicatorPosition?.columnId === column.id && dropIndicatorPosition?.position === index + 1}
                <div class="drop-line"></div>
              {/if}
            {/each}

            {#if column.tasks.length === 0 && dropIndicatorPosition?.columnId === column.id}
              <div class="drop-line"></div>
            {:else if column.tasks.length > 0 && dropIndicatorPosition?.columnId === column.id && dropIndicatorPosition?.position === column.tasks.length}
              <div class="drop-line"></div>
            {/if}

            {#if showTaskModal && taskModalColumnId === column.id}
              <div class="task-inline-form"
                on:focusout={(e) => {
                  const ct = e.currentTarget as HTMLElement;
                  if (ct && !ct.contains(e.relatedTarget as HTMLElement)) submitTask();
                }}>
                <input
                  type="text"
                  placeholder="Task title…"
                  bind:value={taskModalTitle}
                  on:keydown={(e) => e.key === 'Enter' && submitTask()} />
                <textarea
                  placeholder="Description (optional)…"
                  bind:value={taskModalDescription}
                  rows="1"></textarea>
              </div>
            {/if}
          </div>

          <button class="add-task-btn" on:click={() => openTaskModal(column.id)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Add task
          </button>
        </div>
      {/each}

      {#if showColumnModal}
        <div class="column-inline-form"
          on:focusout={(e) => {
            const ct = e.currentTarget as HTMLElement;
            if (ct && !ct.contains(e.relatedTarget as HTMLElement)) submitColumn();
          }}>
          <input
            id="columnTitle"
            type="text"
            placeholder="Column name…"
            bind:value={columnModalTitle}
            on:keydown={(e) => e.key === 'Enter' && submitColumn()} />
        </div>
      {:else}
        <button class="add-column-btn" on:click={openColumnModal}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          New column
        </button>
      {/if}
    </div>
  </div>
{/if}

{#if error}
  <div class="error-bar">
    {error}
    <button on:click={() => error = null}>×</button>
  </div>
{/if}
