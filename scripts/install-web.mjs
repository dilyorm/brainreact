import { spawn } from "node:child_process";
import path from "node:path";

const npmCli = process.env.npm_execpath;

if (!npmCli) {
  console.error("Missing npm_execpath while running postinstall.");
  process.exit(1);
}

const child = spawn(process.execPath, [npmCli, "install"], {
  cwd: path.join(process.cwd(), "apps", "web"),
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
