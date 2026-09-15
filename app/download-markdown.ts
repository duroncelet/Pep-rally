export function markdownCell(value: unknown) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim() || "—";
}

export function safeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "pep-rally-outcome";
}

export function downloadMarkdown(fileName: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName.endsWith(".md") ? fileName : `${fileName}.md`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
