<script lang="ts">
  import { push } from "svelte-spa-router";
  import { onMount } from "svelte";

  onMount(() => push("/boards"));
</script>

<p style="padding: 16px; color: var(--color-secondary); font-size: 14px;">Redirecting…</p>
