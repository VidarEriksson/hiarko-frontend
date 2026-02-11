<script lang="ts">
  import { onMount } from "svelte";
  import { params } from "svelte-spa-router";
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

  let newColumnTitle = "";
  let taskInputs: { [key: number]: string } = {};

  let editingColumnId: number | null = null;
  let editingColumnName: string = "";
  let editInputRef: HTMLInputElement;

  // Drag and drop state
  let draggedTask: any = null;
  let draggedFromColumnId: number | null = null;

  // Task modal state
  let showTaskModal = false;
  let taskModalColumnId: number | null = null;
  let taskModalTitle = "";
  let taskModalDescription = "";

  // Column modal state
  let showColumnModal = false;
  let columnModalTitle = "";

  onMount(() => {
    if ($params?.id) {
      load($params.id);
    }
  });

  $: if ($params?.id) {
    load($params.id);
  }

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

  async function addColumn() {
    const title = prompt("Column name:");
    if (!title || !title.trim()) return;

    try {
      await createColumn(board.id, title.trim());
      await load(board.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  }

  function openColumnModal() {
    showColumnModal = true;
    columnModalTitle = "";
  }

  async function submitColumn() {
    if (!columnModalTitle.trim()) {
      closeColumnModal();
      return;
    }

    try {
      await createColumn(board.id, columnModalTitle.trim());
      closeColumnModal();
      await load(board.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  }

  function closeColumnModal() {
    showColumnModal = false;
  }

  function openEditColumn(columnId: number, columnName: string) {
    editingColumnId = columnId;
    editingColumnName = columnName;
    setTimeout(() => editInputRef?.focus(), 0);
  }

  async function saveEditColumn() {
    if (!editingColumnName.trim() || !editingColumnId) {
      closeEditColumn();
      return;
    }

    try {
      await updateColumn(editingColumnId, { name: editingColumnName.trim() });
      closeEditColumn();
      await load(board.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
      closeEditColumn();
    }
  }

  function closeEditColumn() {
    editingColumnId = null;
    editingColumnName = "";
  }

  function openTaskModal(columnId: number) {
    taskModalColumnId = columnId;
    taskModalTitle = "";
    taskModalDescription = "";
    showTaskModal = true;
  }

  async function submitTask() {
    if (!taskModalTitle.trim() || !taskModalColumnId) {
      closeTaskModal();
      return;
    }

    try {
      await createTask(taskModalColumnId, taskModalTitle.trim(), taskModalDescription.trim());
      closeTaskModal();
      await load(board.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  }

  function closeTaskModal() {
    showTaskModal = false;
  }

  async function deleteTaskHandler(taskId: number) {
    try {
      await deleteTask(taskId);
      await load(board.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  }

  async function deleteColumnHandler(columnId: number) {
    if (!confirm("Delete this column?")) return;
    try {
      await deleteColumn(columnId);
      await load(board.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
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
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
  }

  async function handleDropOnColumn(e: DragEvent, columnId: number) {
    e.preventDefault();
    if (!draggedTask || draggedFromColumnId === null || draggedFromColumnId === columnId) {
      draggedTask = null;
      draggedFromColumnId = null;
      return;
    }

    try {
      // Always drop at position 0 (top of the column) for consistent behavior
      await moveTask(draggedTask.id, columnId, 0);
      draggedTask = null;
      draggedFromColumnId = null;
      await load(board.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  }

</script>

{#if loading}
  <div class="p-6">Loading board…</div>
{:else if error}
  <div class="p-6 text-red-600">{error}</div>
{:else if board}
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-3xl font-bold mb-2">{board.name}</h1>
      {#if board.description}
        <p class="text-gray-600">{board.description}</p>
      {/if}
    </div>

    <div class="flex gap-6 overflow-x-auto pb-4 items-start">
      {#each board.columns as column (column.id)}
        <div
          class="bg-gray-50 rounded-lg border border-gray-200 p-4 shrink-0 w-80"
          role="region"
          on:dragover={handleDragOver}
          on:drop={(e) => handleDropOnColumn(e, column.id)}
        >
          <div class="mb-4 pb-4 border-b border-gray-200 flex justify-between items-center group">
            {#if editingColumnId === column.id}
              <input
                type="text"
                bind:value={editingColumnName}
                bind:this={editInputRef}
                on:keydown={(e) => {
                  if (e.key === 'Enter') saveEditColumn();
                  if (e.key === 'Escape') closeEditColumn();
                }}
                on:focusout={saveEditColumn}
                class="flex-1 text-xl font-bold bg-white border border-blue-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            {:else}
              <h2 class="text-xl font-bold">{column.name}</h2>
              <button
                on:click={() => openEditColumn(column.id, column.name)}
                class="ml-2 px-3 py-2 text-lg text-gray-400 opacity-0 group-hover:opacity-100 hover:text-blue-600 hover:bg-blue-100 rounded transition-all duration-200"
                title="Edit column name"
              >
                ✎
              </button>
            {/if}
            <button
              on:click={() => deleteColumnHandler(column.id)}
              class="text-red-600 hover:text-red-800 text-sm ml-2"
            >
              Delete
            </button>
          </div>

          <!-- Tasks -->
          <div class="space-y-2 mb-4">
            {#each column.tasks as task (task.id)}
              <div
                class="bg-white border border-gray-200 rounded p-3 flex justify-between items-start cursor-move hover:shadow-md transition-shadow"
                role="button"
                tabindex="0"
                draggable="true"
                on:dragstart={(e) => handleDragStart(e, task, column.id)}
              >
                <div>
                  <p class="font-medium">{task.title}</p>
                  {#if task.description}
                    <p class="text-sm text-gray-600">{task.description}</p>
                  {/if}
                </div>
                <button
                  on:click={() => deleteTaskHandler(task.id)}
                  class="text-red-600 hover:text-red-800 text-sm ml-2"
                >
                  ✕
                </button>
              </div>
            {/each}

            <!-- Task Creation Form -->
            {#if showTaskModal && taskModalColumnId === column.id}
              <div 
                class="bg-white border border-gray-200 rounded p-3"
                on:focusout={(e) => {
                  const currentTarget = e.currentTarget as HTMLElement;
                  const relatedTarget = e.relatedTarget as HTMLElement;
                  if (currentTarget && !currentTarget.contains(relatedTarget)) {
                    submitTask();
                  }
                }}
              >
                <input
                  id="taskTitle_{column.id}"
                  type="text"
                  placeholder="Task title..."
                  bind:value={taskModalTitle}
                  on:keydown={(e) => e.key === 'Enter' && submitTask()}
                  class="w-full font-medium mb-2 text-sm border-0 p-0 focus:outline-none"
                />
                <textarea
                  id="taskDesc_{column.id}"
                  placeholder="Add description..."
                  bind:value={taskModalDescription}
                  rows="1"
                  class="w-full text-sm text-gray-600 border-0 p-0 focus:outline-none resize-none"></textarea>
              </div>
            {/if}
          </div>

          <!-- Add Task Button -->
          <button
            on:click={() => openTaskModal(column.id)}
            class="w-full py-2 rounded-lg border-2 border-dashed border-gray-300 hover:border-green-500 hover:bg-green-50 transition-colors flex items-center justify-center gap-2 text-sm font-medium text-gray-600 hover:text-green-600"
          >
            <span class="text-xl">+</span>
            Add Task
          </button>
        </div>
      {/each}

      <!-- Add Column Form -->
      {#if showColumnModal}
        <div 
          class="bg-gray-50 rounded-lg border border-gray-200 p-4 shrink-0 w-80"
          on:focusout={(e) => {
            const currentTarget = e.currentTarget as HTMLElement;
            const relatedTarget = e.relatedTarget as HTMLElement;
            if (currentTarget && !currentTarget.contains(relatedTarget)) {
              submitColumn();
            }
          }}
        >
          <input
            id="columnTitle"
            type="text"
            placeholder="Column name..."
            bind:value={columnModalTitle}
            on:keydown={(e) => e.key === 'Enter' && submitColumn()}
            class="w-full text-xl font-bold border-0 p-0 focus:outline-none bg-transparent"
          />
        </div>
      {:else}
        <!-- Add Column Button -->
        <button
          on:click={openColumnModal}
          class="shrink-0 w-80 h-20 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 flex items-center justify-center transition-colors"
        >
          <div class="flex flex-col items-center gap-2">
            <div class="text-3xl text-gray-400 hover:text-blue-500">+</div>
            <div class="text-sm text-gray-600 hover:text-blue-600 font-medium">New Column</div>
          </div>
        </button>
      {/if}
    </div>
  </div>
{/if}