import { extname } from "node:path";
import type { ForgeLanguage } from "./types.js";

const EXT_MAP: Record<string, ForgeLanguage> = {
  ".py": "python",
  ".pyw": "python",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".mts": "typescript",
  ".cts": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".rs": "rust",
};

export function detectLanguageFromPath(filePath: string): ForgeLanguage | null {
  const ext = extname(filePath).toLowerCase();
  return EXT_MAP[ext] ?? null;
}

export function detectLanguageFromContent(content: string): ForgeLanguage | null {
  const head = content.slice(0, 500);
  if (/^#!.*python/m.test(head)) return "python";
  if (/^#!.*\b(node|tsx?)\b/m.test(head)) return "typescript";
  if (/\buse\s+strict\b/.test(head) && /\brequire\s*\(/.test(head)) return "javascript";
  if (/\bfn\s+\w+/.test(head) && /\bpub\s+/.test(head)) return "rust";
  return null;
}

export function detectLanguage(
  filePath: string,
  content = "",
  fallback: ForgeLanguage = "auto"
): ForgeLanguage {
  const fromPath = detectLanguageFromPath(filePath);
  if (fromPath) return fromPath;

  const fromContent = detectLanguageFromContent(content);
  if (fromContent) return fromContent;

  return fallback === "auto" ? "typescript" : fallback;
}

export function normalizeLanguage(lang: ForgeLanguage): string {
  if (lang === "auto") return "typescript";
  return lang;
}

export function languageMatches(scorerLangs: string[], lang: string): boolean {
  if (scorerLangs.includes(lang)) return true;
  if (lang === "typescript" && scorerLangs.includes("javascript")) return true;
  if (lang === "javascript" && scorerLangs.includes("typescript")) return true;
  return false;
}
