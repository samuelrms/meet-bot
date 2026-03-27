/** URL passada ao yt-dlp: HTTP direto ou busca `ytsearch1:`. */
export function buildYtDlpQueryUrl(query: string): string {
  if (query.startsWith("http://") || query.startsWith("https://")) return query;
  return `ytsearch1:${query}`;
}

/** Código curto do Meet ou URL completa → URL https do Meet. */
export function normalizeMeetUrl(input: string): string {
  return input.startsWith("http") ? input : `https://meet.google.com/${input}`;
}
