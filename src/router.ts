// router.ts: which page of the site is open, stored in the address bar.
// ---------------------------------------------------------------------------
//   #/home          the hub (choose a game)
//   #/pose          Strike a Pose
//   #/higher-lower  Art vs Music: Higher or Lower
//
// Using the "#" part of the URL means no page reloads, the browser's back
// button works, and each game can be opened directly by its URL.
// ---------------------------------------------------------------------------

export type Route = "home" | "pose" | "higher-lower";

const ROUTES: Route[] = ["home", "pose", "higher-lower"];

/** "#/pose" -> "pose". Anything unknown (or empty) -> "home". */
export function parseRoute(hash: string): Route {
  const name = hash.replace(/^#\/?/, "").split(/[/?]/)[0];
  return (ROUTES as string[]).includes(name) ? (name as Route) : "home";
}

/** The other game ("Switch game"). From the hub, go to the pose game. */
export function otherGame(route: Route): Route {
  return route === "pose" ? "higher-lower" : "pose";
}

/** Go to a page (adds a history entry, so Back works). */
export function go(route: Route): void {
  location.hash = `#/${route}`;
}

/** Call `show` now and every time the URL's page changes. */
export function startRouter(show: (route: Route) => void): void {
  window.addEventListener("hashchange", () => show(parseRoute(location.hash)));
  show(parseRoute(location.hash));
}
