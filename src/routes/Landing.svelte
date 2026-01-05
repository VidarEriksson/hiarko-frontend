<script lang="ts">
  import { auth, signOut } from "../stores/auth.store";
  import { push } from "svelte-spa-router";

  $: if (!$auth.token) push("/login");
</script>

<h1>Landing</h1>
<p>Welcome {$auth.user?.email ?? "back"}.</p>

<button on:click={() => { signOut(); push("/login"); }}>
  Sign out
</button>