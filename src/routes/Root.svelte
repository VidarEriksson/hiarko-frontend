<script lang="ts">
  import { auth } from "../stores/auth.store";
  import { push } from "svelte-spa-router";
  import { onMount } from "svelte";

  onMount(() => {
    if ($auth.token) push("/landing");
    else push("/login");
  });
</script>

<p style="padding:16px;">Redirecting...</p>
