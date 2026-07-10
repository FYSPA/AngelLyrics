const TICK_MS = 250;

/**
 * LyricScheduler — programa cambios de línea usando un intervalo fijo.
 * En cada tick calcula la línea que debería mostrarse según el tiempo
 * transcurrido, y solo dispara el callback cuando la línea cambia.
 *
 * Ventajas sobre setTimeout:
 * - Sin deriva/acumulación de error
 * - Sin límite de ~2^31 ms (setTimeout max)
 * - Se adapta automáticamente si la posición inicial está desfasada
 */
export class LyricScheduler {
  /** @type {Array<{timeMs: number, text: string}>} */
  #lyrics = [];

  /** @type {(line: {timeMs: number, text: string}, index: number) => void} */
  #onLineChange;

  /** @type {ReturnType<typeof setInterval>|null} */
  #interval = null;

  /** @type {number} Date.now() cuando se llamó a start() */
  #startedAt = 0;

  /** @type {number} ProgressMs de Spotify al iniciar */
  #startProgressMs = 0;

  /** @type {number} Índice de la última línea mostrada */
  #currentIndex = -1;

  /**
   * @param {Array<{timeMs: number, text: string}>} lyricsArray
   * @param {(line: {timeMs: number, text: string}) => void} onLineChange
   */
  constructor(lyricsArray, onLineChange) {
    this.#lyrics = lyricsArray;
    this.#onLineChange = onLineChange;
  }

  /**
   * Inicia el intervalo que monitorea la línea actual.
   * @param {number} progressMs - Posición actual en ms
   */
  start(progressMs) {
    this.stop();
    console.log(`[Planificador] Iniciando en ${(progressMs / 1000).toFixed(1)}s`);

    this.#startedAt = Date.now();
    this.#startProgressMs = progressMs;
    this.#currentIndex = -1;

    // Mostrar la línea actual inmediatamente
    this.#tick();

    // Revisar cada TICK_MS si cambió la línea
    this.#interval = setInterval(() => this.#tick(), TICK_MS);
  }

  /** Detiene el intervalo. */
  stop() {
    if (this.#interval !== null) {
      clearInterval(this.#interval);
      this.#interval = null;
    }
  }

  /**
   * Reinicia desde una nueva posición (ej. después de un seek).
   * @param {number} newProgressMs
   */
  restart(newProgressMs) {
    console.log(`[Planificador] Reiniciando en ${(newProgressMs / 1000).toFixed(1)}s`);
    this.start(newProgressMs);
  }

  /**
   * Tick: calcula la línea actual según el tiempo estimado y la muestra
   * si es diferente de la última mostrada.
   */
  #tick() {
    if (this.#lyrics.length === 0) return;

    const estimatedMs = this.#startProgressMs + (Date.now() - this.#startedAt);

    // Búsqueda binaria para encontrar la última línea cuyo timestamp
    // sea <= estimatedMs
    let lo = 0;
    let hi = this.#lyrics.length - 1;
    let idx = -1;

    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      if (this.#lyrics[mid].timeMs <= estimatedMs) {
        idx = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    if (idx < 0) return;
    if (idx === this.#currentIndex) return;

    this.#currentIndex = idx;
    this.#onLineChange(this.#lyrics[idx], idx);
  }

  /**
   * Estima la posición actual basada en el tiempo transcurrido.
   * @returns {number}
   */
  get estimatedProgressMs() {
    return this.#startProgressMs + (Date.now() - this.#startedAt);
  }
}
