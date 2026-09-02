import { useEffect, useRef } from "react";

/**
 * Relance `fn` à intervalle régulier.
 * - Pause quand l'onglet est inactif (document.hidden)
 * - Annule la requête en cours au démontage / au tick suivant via AbortSignal
 *
 * @param {(signal: AbortSignal) => void | Promise<void>} fn
 * @param {number} intervalMs
 * @param {{ enabled?: boolean }} [options]
 */
export function usePolling(fn, intervalMs, options = {}) {
  const { enabled = true } = options;
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled || !intervalMs || intervalMs < 1) return undefined;

    let cancelled = false;
    let timerId = null;
    let controller = null;

    const clearTimer = () => {
      if (timerId != null) {
        clearTimeout(timerId);
        timerId = null;
      }
    };

    const abortInFlight = () => {
      if (controller) {
        controller.abort();
        controller = null;
      }
    };

    const run = async () => {
      if (cancelled || document.hidden) return;
      abortInFlight();
      controller = new AbortController();
      try {
        await fnRef.current(controller.signal);
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.error("usePolling:", err);
        }
      }
    };

    const schedule = () => {
      clearTimer();
      if (cancelled || document.hidden) return;
      timerId = setTimeout(async () => {
        await run();
        schedule();
      }, intervalMs);
    };

    const onVisibility = () => {
      if (document.hidden) {
        clearTimer();
        abortInFlight();
      } else {
        run().then(schedule);
      }
    };

    run().then(schedule);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearTimer();
      abortInFlight();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs, enabled]);
}
