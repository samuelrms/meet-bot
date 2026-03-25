/** Item na fila de música (metadados do yt-dlp). */
export interface QueueItem {
  title: string;
  uploader: string;
  duration: string;
  url: string;
  query: string;
}

/** Retorno de injectAudioStream (avaliado no contexto do navegador). */
export interface InjectAudioResult {
  ok: boolean;
  replaced?: number;
  pcs?: number;
  error?: string;
}
