import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(currentFile), "..");
const backupRoot = path.join(projectRoot, ".desktop-export-backups");

const DISABLED_PATHS = [
  {
    source: path.join(projectRoot, "app", "api"),
    backup: path.join(backupRoot, "app-api"),
  },
  {
    source: path.join(projectRoot, "app", "auth", "callback", "route.ts"),
    backup: path.join(backupRoot, "auth-callback-route.ts"),
  },
  {
    source: path.join(projectRoot, "middleware.ts"),
    backup: path.join(backupRoot, "middleware.ts"),
  },
];

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function moveForDesktopExport() {
  await fs.mkdir(backupRoot, { recursive: true });
  const moved = [];
  for (const item of DISABLED_PATHS) {
    if (await exists(item.source)) {
      if (await exists(item.backup)) {
        await fs.rm(item.backup, { recursive: true, force: true });
      }
      await fs.rename(item.source, item.backup);
      moved.push(item);
    }
  }
  return moved;
}

async function restoreMovedPaths(moved) {
  for (const item of [...moved].reverse()) {
    if (await exists(item.backup)) {
      await fs.mkdir(path.dirname(item.source), { recursive: true });
      await fs.rename(item.backup, item.source);
    }
  }
  if (await exists(backupRoot)) {
    await fs.rm(backupRoot, { recursive: true, force: true });
  }
}

async function run() {
  const moved = await moveForDesktopExport();
  try {
    const nextBin = path.join(
      projectRoot,
      "node_modules",
      "next",
      "dist",
      "bin",
      "next",
    );
    const result = spawnSync(process.execPath, [nextBin, "build"], {
      stdio: "inherit",
      cwd: projectRoot,
      env: {
        ...process.env,
        ORBIT_DESKTOP_EXPORT: "1",
      },
    });

    if (result.error) {
      throw result.error;
    }

    await restoreMovedPaths(moved);
    process.exit(result.status ?? 1);
  } catch (error) {
    await restoreMovedPaths(moved);
    throw error;
  }
}

void run();
