<script lang="ts">
  import Router, { push } from "svelte-spa-router";

  import Root from "./routes/Root.svelte";
  import Login from "./routes/Login.svelte";
  import Landing from "./routes/Landing.svelte";
  import Boards from "./routes/Boards.svelte";
  import Board from "./routes/boards/[id].svelte";
  import Orgs from "./routes/Orgs.svelte";
  import Org from "./routes/orgs/[id].svelte";
  import Register from "./routes/Register.svelte";
  import NotFound from "./routes/NotFound.svelte";

  let menuOpen = false;

  const routes = {
    "/": Root,
    "/login": Login,
    "/register": Register,
    "/landing": Landing,
    "/boards": Boards,
    "/boards/:id": Board,
    "/orgs": Orgs,
    "/orgs/:id": Org,
    "*": NotFound
  };

  function toggleMenu() {
    menuOpen = !menuOpen;
  }

  function go(path: string) {
    menuOpen = false;
    push(path);
  }
</script>

<style>
  .hamburger {
    position: fixed;
    top: 16px;
    left: 16px;
    font-size: 24px;
    cursor: pointer;
    z-index: 1000;
  }

  .menu-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
    z-index: 900;
  }

  .menu {
    position: fixed;
    top: 0;
    left: 0;
    width: 200px;
    height: 100%;
    background: #fff;
    box-shadow: 2px 0 5px rgba(0, 0, 0, 0.2);
    padding: 1rem;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    z-index: 1000;
  }

  .menu.open {
    transform: translateX(0);
  }

  .menu a {
    display: block;
    margin: 0.5rem 0;
    color: #333;
    text-decoration: none;
  }
</style>

<button class="hamburger" on:click={toggleMenu} aria-label="Toggle menu">
  ☰
</button>

{#if menuOpen}
  <button class="menu-overlay" on:click={toggleMenu} aria-label="Close menu"></button>
{/if}

<nav class="menu {menuOpen ? 'open' : ''}">
  <a href="/boards" on:click|preventDefault={() => go('/boards')}>Boards</a>
  <a href="/orgs" on:click|preventDefault={() => go('/orgs')}>Organizations</a>
</nav>

<Router {routes} />
