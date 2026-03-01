<script lang="ts">
  import { auth, signOut } from "../stores/auth.store";
  import { push } from "svelte-spa-router";

  $: if (!$auth.token) push("/login");

  function handleSignOut() {
    signOut();
    push("/login");
  }
</script>

<div class="min-h-screen flex items-center justify-center p-8">
  <div class="w-full max-w-3xl bg-white rounded-2xl shadow-lg p-8" style="background: var(--color-card);">
    <div class="flex flex-col md:flex-row items-center gap-8">
      <div class="flex-1">
        <h1 class="text-3xl font-bold mb-2">Welcome to Hiarko</h1>
<p class="text-gray-700 mb-4">Hello, <strong>{$auth.user?.email ?? 'friend'}</strong> — great to have you here.</p>

        <p class="text-sm text-gray-600 mb-6">This is your landing page. For now, head to <em>/boards</em> manually to see your boards.</p>

        <div class="flex gap-3">
          <button on:click={() => push('/boards')} class="px-4 py-2 rounded bg-indigo-600 text-white font-medium">Go to Boards (manual)</button>
          <button on:click={handleSignOut} class="px-4 py-2 rounded border border-gray-200">Sign out</button>
        </div>
      </div>

      <div class="w-48 h-48 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center text-white text-center p-4">
        <div>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M12 2C13.1046 2 14 2.89543 14 4C14 5.10457 13.1046 6 12 6C10.8954 6 10 5.10457 10 4C10 2.89543 10.8954 2 12 2Z" fill="white"/>
            <path d="M4 20C4 15.5817 7.58172 12 12 12C16.4183 12 20 15.5817 20 20" stroke="rgba(255,255,255,0.9)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <div class="mt-2 text-sm">Start planning</div>
        </div>
      </div>
    </div>
  </div>
</div>
<button on:click={() => { signOut(); push("/login"); }}>
  Sign out
</button>