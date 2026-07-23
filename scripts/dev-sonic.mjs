// Dev launcher: starts the Next.js app AND the Nova 2 Sonic WebSocket bridge together.
//
//   npm run dev:sonic
//
// Ports are configurable (NEXT app: PORT/3000, Nova bridge: NOVA_SONIC_WS_PORT/3010). If EITHER
// port is already in use, this fails with a clear message instead of silently picking another
// port. Plain Node ESM (no TS) so it needs no runner.

import { spawn } from "node:child_process";
import net from "node:net";

const APP_PORT = Number.parseInt(process.env.PORT ?? "3000", 10);
const BRIDGE_PORT = Number.parseInt(process.env.NOVA_SONIC_WS_PORT ?? "3010", 10);

function checkPortFree(port, label) {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once("error", (err) => {
        if (err.code === "EADDRINUSE") {
          console.error(
            `\n✖ ${label} port ${port} is already in use.\n` +
              `  Stop whatever is using it, or set a different port and retry.\n`,
          );
          resolve(false);
        } else {
          console.error(`\n✖ Could not check ${label} port ${port}: ${err.message}\n`);
          resolve(false);
        }
      })
      .once("listening", () => tester.close(() => resolve(true)));
    tester.listen(port, "127.0.0.1");
  });
}

async function main() {
  const appFree = await checkPortFree(APP_PORT, "Next app");
  const bridgeFree = await checkPortFree(BRIDGE_PORT, "Nova bridge");
  if (!appFree || !bridgeFree) {
    process.exit(1);
  }

  console.info(
    `\n▶ Starting Next.js (http://localhost:${APP_PORT}) + Nova 2 Sonic bridge (ws://localhost:${BRIDGE_PORT})\n`,
  );

  const children = [];
  const spawnChild = (name, command, args, extraEnv = {}) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: { ...process.env, ...extraEnv },
    });
    child.on("exit", (code) => {
      console.info(`\n[${name}] exited (code ${code ?? "null"}). Shutting down the other process…`);
      shutdown();
    });
    children.push(child);
    return child;
  };

  let shuttingDown = false;
  function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    for (const c of children) {
      try {
        c.kill();
      } catch {
        /* ignore */
      }
    }
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  spawnChild("next", "npm", ["run", "dev"], { PORT: String(APP_PORT) });
  spawnChild("nova-bridge", "npm", ["run", "sonic:bridge"], { NOVA_SONIC_WS_PORT: String(BRIDGE_PORT) });
}

main();
