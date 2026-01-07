<script lang="ts">
  import Router from "svelte-spa-router";

  import Root from "./routes/Root.svelte";
  import Login from "./routes/Login.svelte";
  import Landing from "./routes/Landing.svelte";
  import Boards from "./routes/Boards.svelte";
  import NotFound from "./routes/NotFound.svelte";

  const routes = {
    "/": Root,
    "/login": Login,
    "/landing": Landing,
    "/boards": Boards,
    "*": NotFound
  };
</script>

<Router {routes} />
