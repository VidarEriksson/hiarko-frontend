<script lang="ts">
  import { register, auth, signIn } from "../stores/auth.store";
  import { push } from "svelte-spa-router";

  let email = "";
  let password = "";
  let loading = false;
  let error: string | null = null;

  $: if ($auth.initialized && $auth.token) push("/boards");

  async function handleRegister() {
    loading = true;
    error = null;

    try {
      const res = await register(email, password);
      if (!res.token) await signIn(email, password);
      push("/boards");
    } catch (e) {
      error = e instanceof Error ? e.message : "Registration failed";
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center p-8">
  <div class="w-full max-w-md bg-white rounded-2xl shadow-lg p-8" style="background: var(--color-card); border: 1px solid rgba(15,23,42,0.04);">
    <h1 class="text-2xl font-bold mb-4 text-gray-900" style="color: var(--color-foreground);">Create an account</h1>
    <p class="text-sm text-gray-600 mb-6">Start a free account and create your first board.</p>

    <form on:submit|preventDefault={handleRegister} class="space-y-4">
      <div>
        <label for="register-email" class="sr-only">Email</label>
        <input id="register-email" type="email" bind:value={email} required placeholder="Email"
          class="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-opacity-50" />
      </div>

      <div>
        <label for="register-password" class="sr-only">Password</label>
        <input id="register-password" type="password" bind:value={password} required minlength="6" placeholder="Password"
          class="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-opacity-50" />
      </div>

      {#if error}
        <p class="text-sm text-red-600">{error}</p>
      {/if}

      <button class="w-full py-3 rounded-lg font-semibold"
        style="background: transparent; color: var(--color-accent); border: 2px solid var(--color-accent);"
        disabled={loading}>
        {loading ? "Creating…" : "Create account"}
      </button>

      <p class="mt-4 text-center text-sm text-gray-600">Already have an account? <a href="#/login" class="text-indigo-600 font-medium">Sign in</a></p>
    </form>
  </div>
</div>