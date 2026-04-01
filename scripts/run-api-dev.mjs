import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const configuredPython = process.env.API_PYTHON;
const candidates = [
  configuredPython,
  path.join(repoRoot, "apps", "api", ".venv", "bin", "python"),
  path.join(repoRoot, "apps", "api", ".venv", "Scripts", "python.exe"),
].filter(Boolean);

const python = candidates.find((candidate) => existsSync(candidate));

if (!python) {
  console.error("Missing API Python runtime. Create apps/api/.venv as documented or set API_PYTHON to a Python 3.11 interpreter.");
  process.exit(1);
}

const child = spawn(
  python,
  ["-m", "uvicorn", "app.main:app", "--reload", "--port", "8000", "--app-dir", "apps/api"],
  { stdio: "inherit" },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
