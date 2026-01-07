<script lang="ts">
  import { auth, initAuth } from "../stores/auth.store";
  import { push } from "svelte-spa-router";
  import { onMount } from "svelte";

  onMount(async () => {
    if (!$auth.initialized) await initAuth();

    if ($auth.token) push("/boards");
    else push("/login");
  });
</script>

<p style="padding:16px;">Redirecting...</p>
