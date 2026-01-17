<script lang="ts">
  import Router from "svelte-spa-router";

  import Root from "./routes/Root.svelte";
  import Login from "./routes/Login.svelte";
  import Landing from "./routes/Landing.svelte";
  import Boards from "./routes/Boards.svelte";
  import Board from "./routes/boards/[id].svelte";
  import Register from "./routes/Register.svelte";
  import NotFound from "./routes/NotFound.svelte";

  const routes = {
    "/": Root,
    "/login": Login,
    "/register": Register,
    "/landing": Landing,
    "/boards": Boards,
    "/boards/:id": Board,
    "*": NotFound
  };
</script>

<Router {routes} />
