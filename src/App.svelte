<script lang="ts">
  import Router, { push, location } from "svelte-spa-router";
  import { auth, signOut } from "./stores/auth.store";

  import Root from "./routes/Root.svelte";
  import Login from "./routes/Login.svelte";
  import Landing from "./routes/Landing.svelte";
  import Boards from "./routes/Boards.svelte";
  import Board from "./routes/boards/[id].svelte";
  import Orgs from "./routes/Orgs.svelte";
  import Org from "./routes/orgs/[id].svelte";
  import Register from "./routes/Register.svelte";
  import NotFound from "./routes/NotFound.svelte";

  const routes = {
    "/": Root,
    "/login": Login,
    "/register": Register,
    "/landing": Landing,
    "/boards": Boards,
    "/boards/:id": Board,
    "/orgs": Orgs,
    "/orgs/:id": Org,
    "*": NotFound,
  };

  let collapsed = localStorage.getItem("sidebar-collapsed") === "true";

  function toggleCollapsed() {
    collapsed = !collapsed;
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }

  $: showSidebar =
    !!$auth.token &&
    !['/', '/login', '/register'].includes($location);

  $: activeSection = $location.startsWith('/boards')
    ? 'boards'
    : $location.startsWith('/orgs')
    ? 'orgs'
    : '';

  $: sidebarWidth = collapsed ? '52px' : '220px';

  function go(path: string) { push(path); }
</script>

<style>
  aside {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    background: var(--color-card);
    border-right: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    z-index: 100;
    transition: width 0.2s ease;
    overflow: hidden;
  }

  .brand {
    padding: 18px 14px 14px;
    font-size: 17px;
    font-weight: 700;
    color: var(--color-foreground);
    letter-spacing: -0.3px;
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
    flex-shrink: 0;
    min-height: 56px;
  }

  .brand-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-accent);
    flex-shrink: 0;
  }

  .brand-text {
    transition: opacity 0.15s ease;
  }

  .nav-section {
    flex: 1;
    padding: 4px 6px;
    overflow: hidden;
  }

  .nav-label {
    font-size: 10.5px;
    font-weight: 600;
    color: var(--color-secondary);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 8px 8px 4px;
    white-space: nowrap;
    transition: opacity 0.15s ease;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 7px 10px;
    border-radius: 6px;
    font-size: 13.5px;
    font-weight: 500;
    color: var(--color-secondary);
    cursor: pointer;
    text-decoration: none;
    transition: background 0.1s, color 0.1s;
    margin-bottom: 1px;
    border: none;
    background: none;
    width: 100%;
    text-align: left;
    white-space: nowrap;
  }

  .nav-item:hover {
    background: rgba(15, 23, 42, 0.05);
    color: var(--color-foreground);
  }

  .nav-item.active {
    background: rgba(124, 58, 237, 0.08);
    color: var(--color-accent);
  }

  .nav-item svg { flex-shrink: 0; opacity: 0.7; }
  .nav-item.active svg { opacity: 1; }

  .nav-label-text,
  .nav-item-label {
    transition: opacity 0.15s ease;
  }

  .user-section {
    padding: 10px 6px;
    border-top: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .user-row {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 5px 8px;
    margin-bottom: 2px;
    min-height: 36px;
    white-space: nowrap;
    overflow: hidden;
  }

  .avatar {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--color-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 11px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .user-email {
    font-size: 12px;
    color: var(--color-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    transition: opacity 0.15s ease;
  }

  .signout-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 7px 10px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-secondary);
    background: none;
    border: none;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
    text-align: left;
    white-space: nowrap;
  }

  .signout-btn:hover {
    background: rgba(15, 23, 42, 0.05);
    color: var(--color-foreground);
  }

  .toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 8px 0;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--color-secondary);
    transition: color 0.1s;
    border-top: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .toggle-btn:hover { color: var(--color-foreground); }

  .toggle-icon {
    transition: transform 0.2s ease;
  }

  main { min-height: 100vh; transition: margin-left 0.2s ease; }
</style>

{#if showSidebar}
  <aside style="width: {sidebarWidth};">
    <div class="brand">
      <div class="brand-dot"></div>
      <span class="brand-text" style="opacity: {collapsed ? 0 : 1};">Hiarko</span>
    </div>

    <nav class="nav-section">
      <div class="nav-label">
        <span class="nav-label-text" style="opacity: {collapsed ? 0 : 1};">Workspace</span>
      </div>

      <button
        class="nav-item {activeSection === 'boards' ? 'active' : ''}"
        title={collapsed ? 'Boards' : ''}
        on:click={() => go('/boards')}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
        </svg>
        <span class="nav-item-label" style="opacity: {collapsed ? 0 : 1};">Boards</span>
      </button>

      <button
        class="nav-item {activeSection === 'orgs' ? 'active' : ''}"
        title={collapsed ? 'Organizations' : ''}
        on:click={() => go('/orgs')}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 21h18M9 21V7l6-4v18M9 11H3v10M15 21V11h6v10"/>
        </svg>
        <span class="nav-item-label" style="opacity: {collapsed ? 0 : 1};">Organizations</span>
      </button>
    </nav>

    <div class="user-section">
      <div class="user-row">
        <div class="avatar" title={collapsed ? ($auth.user?.email ?? '') : ''}>
          {($auth.user?.email?.[0] ?? '?').toUpperCase()}
        </div>
        <span class="user-email" style="opacity: {collapsed ? 0 : 1};">{$auth.user?.email ?? ''}</span>
      </div>

      <button class="signout-btn" title={collapsed ? 'Sign out' : ''} on:click={() => { signOut(); go('/login'); }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
        </svg>
        <span style="opacity: {collapsed ? 0 : 1};">Sign out</span>
      </button>
    </div>

    <button class="toggle-btn" on:click={toggleCollapsed} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
      <svg
        class="toggle-icon"
        style="transform: rotate({collapsed ? 180 : 0}deg);"
        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 18l-6-6 6-6"/>
      </svg>
    </button>
  </aside>
{/if}

<main style={showSidebar ? `margin-left: ${sidebarWidth}` : ''}>
  <Router {routes} />
</main>
