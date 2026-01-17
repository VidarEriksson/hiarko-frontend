<script lang="ts">
  import { onMount } from "svelte";
  import { params } from "svelte-spa-router";
  import {
    getBoard,
    createColumn,
    createTask,
    deleteTask,
    deleteColumn,
  } from "../../lib/api";

  let loading = true;
  let error: string | null = null;
  let board: any = null;

  let newColumnTitle = "";
  let taskInputs: { [key: number]: string } = {};

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
    const title = newColumnTitle.trim();
    if (!title) return;

    try {
      await createColumn(board.id, title);
      newColumnTitle = "";
      await load(board.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  }

  async function addTask(columnId: number) {
    const title = (taskInputs[columnId] || "").trim();
    if (!title) return;

    try {
      await createTask(columnId, title);
      taskInputs[columnId] = "";
      await load(board.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
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

    <div class="mb-6 flex gap-2">
      <input
        type="text"
        placeholder="New column name..."
        bind:value={newColumnTitle}
        on:keydown={(e) => e.key === 'Enter' && addColumn()}
        class="border border-gray-300 rounded px-3 py-2"
      />
      <button on:click={addColumn} class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
        Add Column
      </button>
    </div>

    <div class="flex gap-6 overflow-x-auto pb-4">
      {#each board.columns as column (column.id)}
        <div class="bg-gray-50 rounded-lg border border-gray-200 p-4 flex-shrink-0 w-80">
          <div class="mb-4 pb-4 border-b border-gray-200 flex justify-between items-center">
            <h2 class="text-xl font-bold">{column.name}</h2>
            <button
              on:click={() => deleteColumnHandler(column.id)}
              class="text-red-600 hover:text-red-800 text-sm"
            >
              Delete
            </button>
          </div>

          <!-- Tasks -->
          <div class="space-y-2 mb-4">
            {#each column.tasks as task (task.id)}
              <div class="bg-white border border-gray-200 rounded p-3 flex justify-between items-start">
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
          </div>

          <!-- Task Input -->
          <div class="flex gap-2">
            <input
              type="text"
              placeholder="New task..."
              bind:value={taskInputs[column.id]}
              on:keydown={(e) => e.key === 'Enter' && addTask(column.id)}
              class="border border-gray-300 rounded px-2 py-1 text-sm flex-1"
            />
            <button
              on:click={() => addTask(column.id)}
              class="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
            >
              Add
            </button>
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}