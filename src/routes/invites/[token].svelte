<script lang="ts">
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import { auth } from "../../stores/auth.store";
  import { getInvite, acceptInvite, declineInvite } from "../../lib/api";

  export let params: { token: string } = { token: "" };

  let invite: any = null;
  let loading = true;
  let error: string | null = null;
  let accepting = false;
  let declining = false;
  let done = false;
  let doneMessage = "";
  let doneOrg: any = null;

  onMount(async () => {
    try {
      const data = await getInvite(params.token);
      invite = data.invite;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  });

  async function handleAccept() {
    if (!$auth.token) {
      sessionStorage.setItem("redirect", `/invites/${params.token}`);
      push("/login");
      return;
    }
    accepting = true;
    error = null;
    try {
      const { org } = await acceptInvite(params.token);
      doneOrg = org;
      doneMessage = `You've joined ${org.name}!`;
      done = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      accepting = false;
    }
  }

  async function handleDecline() {
    if (!$auth.token) {
      push("/login");
      return;
    }
    declining = true;
    error = null;
    try {
      await declineInvite(params.token);
      doneMessage = "Invite declined.";
      done = true;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      declining = false;
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center p-6" style="background: var(--color-bg);">
  <div class="w-full max-w-md">

    {#if loading}
      <div class="rounded-2xl p-8 text-center" style="background: var(--color-card); border: 1px solid var(--color-border);">
        <div class="w-10 h-10 rounded-full mx-auto mb-4 animate-pulse" style="background: var(--color-border);"></div>
        <div class="h-4 w-40 rounded mx-auto mb-2 animate-pulse" style="background: var(--color-border);"></div>
        <div class="h-3 w-56 rounded mx-auto animate-pulse" style="background: var(--color-border);"></div>
      </div>

    {:else if error}
      <div class="rounded-2xl p-8 text-center" style="background: var(--color-card); border: 1px solid var(--color-border);">
        <div class="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4" style="background: #fef2f2;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h1 class="text-base font-semibold mb-1" style="color: var(--color-foreground);">Invalid invite</h1>
        <p class="text-sm mb-6" style="color: var(--color-secondary);">{error}</p>
        <button
          class="text-sm font-medium px-4 py-2 rounded-lg"
          style="background: rgba(124,58,237,0.08); color: var(--color-accent); border: none; cursor: pointer;"
          on:click={() => push('/')}>
          Go home
        </button>
      </div>

    {:else if done}
      <div class="rounded-2xl p-8 text-center" style="background: var(--color-card); border: 1px solid var(--color-border);">
        <div class="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4" style="background: rgba(34,197,94,0.1);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h1 class="text-base font-semibold mb-1" style="color: var(--color-foreground);">{doneMessage}</h1>
        {#if doneOrg}
          <p class="text-sm mb-6" style="color: var(--color-secondary);">You now have access to all boards in this organization.</p>
          <button
            class="text-sm font-medium px-4 py-2 rounded-lg"
            style="background: var(--color-accent); color: white; border: none; cursor: pointer;"
            on:click={() => push('/orgs')}>
            View organizations
          </button>
        {:else}
          <p class="text-sm mb-6" style="color: var(--color-secondary);">You have declined the invite.</p>
          <button
            class="text-sm font-medium px-4 py-2 rounded-lg"
            style="background: rgba(124,58,237,0.08); color: var(--color-accent); border: none; cursor: pointer;"
            on:click={() => push('/')}>
            Go home
          </button>
        {/if}
      </div>

    {:else if invite}
      <div class="rounded-2xl p-8" style="background: var(--color-card); border: 1px solid var(--color-border);">
        <!-- Org avatar -->
        <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg mb-5"
          style="background: var(--color-accent);">
          {invite.org.name[0].toUpperCase()}
        </div>

        <h1 class="text-lg font-semibold mb-1" style="color: var(--color-foreground); letter-spacing: -0.3px;">
          You've been invited to join
        </h1>
        <p class="text-xl font-bold mb-1" style="color: var(--color-foreground); letter-spacing: -0.4px;">{invite.org.name}</p>
        <p class="text-sm mb-6" style="color: var(--color-secondary);">
          Invited by {invite.invitedBy.name ?? invite.invitedBy.email}
        </p>

        {#if !$auth.token}
          <div class="rounded-lg px-4 py-3 mb-5 text-sm" style="background: rgba(124,58,237,0.06); color: var(--color-secondary); border: 1px solid rgba(124,58,237,0.15);">
            You need to be signed in to accept this invite. Make sure to sign in with <strong style="color: var(--color-foreground);">{invite.email}</strong>.
          </div>
          <button
            class="w-full py-2.5 rounded-xl text-sm font-semibold mb-2"
            style="background: var(--color-accent); color: white; border: none; cursor: pointer;"
            on:click={() => { sessionStorage.setItem('redirect', `/invites/${params.token}`); push('/login'); }}>
            Sign in to accept
          </button>
        {:else}
          {#if error}
            <div class="rounded-lg px-4 py-3 mb-4 text-sm" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;">
              {error}
            </div>
          {/if}
          <div class="flex gap-3">
            <button
              class="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity"
              style="background: var(--color-accent); color: white; border: none; cursor: pointer; opacity: {accepting ? 0.6 : 1};"
              disabled={accepting || declining}
              on:click={handleAccept}>
              {accepting ? 'Joining…' : 'Accept invite'}
            </button>
            <button
              class="px-5 py-2.5 rounded-xl text-sm font-medium transition-opacity"
              style="background: var(--color-bg); color: var(--color-secondary); border: 1px solid var(--color-border); cursor: pointer; opacity: {declining ? 0.6 : 1};"
              disabled={accepting || declining}
              on:click={handleDecline}>
              {declining ? 'Declining…' : 'Decline'}
            </button>
          </div>
        {/if}
      </div>
    {/if}

  </div>
</div>
