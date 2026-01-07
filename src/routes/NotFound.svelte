<script lang="ts">
  import { push } from "svelte-spa-router";
</script>

<section class="min-h-screen flex items-center justify-center p-8">
  <div class="text-center">
    <h1 class="text-2xl font-bold mb-2">Page not found</h1>
    <p class="text-gray-600 mb-4">We couldn't find that page.</p>
    <div class="flex justify-center gap-3">
      <button class="px-4 py-2 rounded-md text-white font-semibold" style="background: var(--color-accent);" on:click={() => push('/')}>Home</button>
      <button class="px-4 py-2 rounded-md bg-transparent border border-gray-200" on:click={() => push('/login')}>Log in</button>
    </div>
  </div>
</section>