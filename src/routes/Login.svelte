<script lang="ts">
  import { auth, signIn } from "../stores/auth.store";
  import { push } from "svelte-spa-router";

  let email = "";
  let password = "";
  let loading = false;
  let error: string | null = null;

  $: if ($auth.token) push("/landing");

  async function handleLogin() {
    loading = true;
    error = null;

    try {
      await signIn(email, password);
      push("/landing");
    } catch (e) {
      error = e instanceof Error ? e.message : "Login failed";
    } finally {
      loading = false;
    }
  }
</script>

<h1>Login</h1>

<form on:submit|preventDefault={handleLogin}>
  <input type="email" bind:value={email} placeholder="Email" required />
  <input type="password" bind:value={password} placeholder="Password" required minlength="2" />

  {#if error}
    <p style="color:red">{error}</p>
  {/if}

  <button disabled={loading}>
    {loading ? "Signing in..." : "Sign in"}
  </button>
</form>
