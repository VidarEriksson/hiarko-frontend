<script lang="ts">
  import { auth, signIn } from "../stores/auth.store";
  import { push } from "svelte-spa-router";

  let email = "";
  let password = "";
  let loading = false;
  let error: string | null = null;

  $: if ($auth.initialized && $auth.token) push("/landing");

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

<div class="min-h-screen flex">
  <!-- Left: form -->
  <div class="w-full md:w-1/2 flex items-center justify-center p-8">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-lg p-8"
         style="background: var(--color-card);">
      <h1 class="text-2xl font-bold mb-6 text-gray-900">Welcome back</h1>
      <p class="text-sm text-gray-600 mb-6">Sign in to continue to Hiarko.</p>

      <form on:submit|preventDefault={handleLogin} class="space-y-4">
        <div>
          <label for="email" class="sr-only">Email</label>
          <input type="email" id="email" bind:value={email} required placeholder="Email"
            class="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-opacity-50"
            style="border-color: rgba(15,23,42,0.06)" />
        </div>

        <div>
          <label for="password" class="sr-only">Password</label>
          <input type="password" id="password" bind:value={password} required minlength="2" placeholder="Password"
            class="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-opacity-50"
            />
        </div>

        {#if error}
          <p class="text-sm text-red-600">{error}</p>
        {/if}

        <button type="submit" class="w-full py-3 rounded-lg text-white font-semibold"
          style="background: var(--color-accent); box-shadow: 0 6px 20px rgba(109,40,217,0.15)"
          disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-gray-500">Don’t have an account? <a href="#/register"
        class="text-indigo-600 font-medium">Sign up</a></p>
    </div>
  </div>

  <!-- Right: SVG illustration -->
  <div class="hidden md:block md:w-1/2 relative">
    <div class="absolute inset-0 bg-cover bg-center" style="background-image: url('/assets/thinking_man_login.svg');"></div>
    <div class="absolute inset-0" style="background: linear-gradient(180deg, rgba(var(--color-accent-rgb),0.65), rgba(var(--color-accent-2-rgb),0.65));"></div>

    <div class="relative z-10 h-full flex items-center justify-center">
      <div class="text-white max-w-xs p-8">
        <h2 class="text-3xl font-bold mb-3">Hiarko</h2>
        <p class="opacity-90">Simple planning, real progress.</p>
      </div>
    </div>
  </div>
</div>
