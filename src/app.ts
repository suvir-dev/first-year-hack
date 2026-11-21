// app.ts: the site's entry point. It wires the two games to the router.
// ---------------------------------------------------------------------------
// One page, three areas, and only one is visible at a time:
//   #hub       the home hub        (#/home)
//   #pose-app  Strike a Pose       (#/pose)          main.ts
//   #hl-root   Higher or Lower     (#/higher-lower)  games/higher-lower (React)
// Leaving the pose game turns the camera off; leaving Higher or Lower
// removes its React app. The background music keeps playing throughout.
// ---------------------------------------------------------------------------

import { startPoseGame, stopPoseGame, whenSiteEntered } from "./main";
import { mountHigherLower, unmountHigherLower } from "./games/higher-lower/mount.jsx";
import { go, otherGame, startRouter } from "./router";
import type { Route } from "./router";

const nav = document.getElementById("site-nav")!;
const hub = document.getElementById("hub")!;
const poseApp = document.getElementById("pose-app")!;
const hlRoot = document.getElementById("hl-root")!;
const intro = document.getElementById("screen-intro")!;

/** The page currently showing (null = still on the intro). */
let current: Route | null = null;

function show(route: Route): void {
  if (current === route) return;

  // Leave the old page cleanly.
  if (current === "pose") stopPoseGame(); // camera off, loops stopped
  if (current === "higher-lower") unmountHigherLower();

  intro.hidden = true;
  nav.hidden = false;
  hub.hidden = route !== "home";
  poseApp.hidden = route !== "pose";
  hlRoot.hidden = route !== "higher-lower";
  document.body.dataset.route = route; // lets CSS style each page

  // Open the new page.
  if (route === "pose") startPoseGame();
  if (route === "higher-lower") mountHigherLower(hlRoot);

  current = route;
  window.scrollTo(0, 0);
}

document.getElementById("switch-game")!.addEventListener("click", () => {
  go(otherGame(current ?? "home"));
});

// The intro ("Enter the gallery") comes first: its click also lets the
// browser play sound. After that the router takes over.
whenSiteEntered(() => startRouter(show));
