<script lang="ts">
  import { auth, signIn } from "../stores/auth.store";
  import { push } from "svelte-spa-router";

  let email = "";
  let password = "";
  let loading = false;
  let error: string | null = null;

  $: if ($auth.initialized && $auth.token) push("/boards");

  async function handleLogin() {
    loading = true;
    error = null;
    try {
      await signIn(email, password);
      push("/boards");
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
    <div class="w-full max-w-sm">
      <div class="mb-8">
        <div class="flex items-center gap-2 mb-6">
          <div class="w-2 h-2 rounded-full" style="background: var(--color-accent);"></div>
          <span class="font-bold text-base" style="color: var(--color-foreground);">Hiarko</span>
        </div>
        <h1 class="text-2xl font-bold mb-1" style="color: var(--color-foreground); letter-spacing: -0.4px;">Welcome back</h1>
        <p class="text-sm" style="color: var(--color-secondary);">Sign in to your account to continue.</p>
      </div>

      <form on:submit|preventDefault={handleLogin} class="space-y-3">
        <div>
          <label for="email" class="block text-sm font-medium mb-1.5" style="color: var(--color-foreground);">Email</label>
          <input type="email" id="email" bind:value={email} required placeholder="you@example.com"
            class="w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2"
            style="border: 1px solid var(--color-border); background: var(--color-card); color: var(--color-foreground); focus-ring-color: var(--color-accent);" />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium mb-1.5" style="color: var(--color-foreground);">Password</label>
          <input type="password" id="password" bind:value={password} required placeholder="••••••••"
            class="w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2"
            style="border: 1px solid var(--color-border); background: var(--color-card); color: var(--color-foreground);" />
        </div>

        {#if error}
          <div class="px-3.5 py-2.5 rounded-lg text-sm" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;">
            {error}
          </div>
        {/if}

        <button type="submit"
          class="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity"
          style="background: var(--color-accent);"
          class:opacity-60={loading}
          disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p class="mt-6 text-center text-sm" style="color: var(--color-secondary);">
        Don't have an account?
        <a href="#/register" class="font-medium" style="color: var(--color-accent);">Sign up</a>
      </p>
    </div>
  </div>

  <!-- Right: brand panel -->
  <div class="hidden md:flex md:w-1/2 items-center justify-center relative overflow-hidden"
    style="background: linear-gradient(135deg, var(--color-accent) 0%, #4f46e5 100%);">
    <div class="relative z-10 text-white text-center px-12">
      <h2 class="text-3xl font-bold mb-3" style="letter-spacing: -0.5px;">Plan with clarity.</h2>
      <p class="text-base opacity-80">Boards, tasks, and teams — all in one place.</p>
    </div>
  </div>
</div>
