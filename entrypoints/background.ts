import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import {
  DEFAULT_SELECTED_ADDRESS,
  getEntitySnapshot,
  simulateParetoTrade,
} from "../src/lib/fixtures";
import type { ParetoState, RuntimeEvent, RuntimeMessage, RuntimeResponse } from "../src/lib/types";

interface StoredParetoState {
  selectedAddress?: string;
  watchlist?: string[];
  tradeHistory?: ParetoState["tradeHistory"];
}

type ChromeSidePanelApi = {
  sidePanel?: {
    setPanelBehavior?: (behavior: { openPanelOnActionClick: boolean }) => Promise<void> | void;
  };
};

export default defineBackground({
  type: "module",
  main() {
    void enableSidePanelAction();

    browser.runtime.onMessage.addListener(
      (message: RuntimeMessage): Promise<RuntimeResponse | undefined> =>
        handleRuntimeMessage(message),
    );
  },
});

async function handleRuntimeMessage(message: RuntimeMessage): Promise<RuntimeResponse | undefined> {
  try {
    switch (message.type) {
      case "getState":
        return { ok: true, state: await readParetoState() };
      case "getEntity": {
        const state = await readStoredState();
        return { ok: true, entity: getEntitySnapshot(message.address, state.watchlist ?? []) };
      }
      case "selectEntity": {
        await browser.storage.local.set({ selectedAddress: message.address });
        await broadcastRuntimeEvent({ type: "selectionChanged", address: message.address });
        return {
          ok: true,
          entity: getEntitySnapshot(message.address, (await readStoredState()).watchlist),
        };
      }
      case "toggleWatchlist": {
        const stored = await readStoredState();
        const nextWatchlist = toggleAddress(stored.watchlist ?? [], message.address);
        await browser.storage.local.set({ watchlist: nextWatchlist });
        await broadcastRuntimeEvent({ type: "stateChanged" });
        return { ok: true, entity: getEntitySnapshot(message.address, nextWatchlist) };
      }
      case "simulateTrade": {
        const draft = simulateParetoTrade(
          message.address,
          message.side,
          message.amountSol,
          message.slippageBps,
          message.priorityFeeSol,
        );
        return { ok: true, draft };
      }
      case "recordDemoTrade": {
        const stored = await readStoredState();
        const nextTrade = { ...message.draft, status: "recorded" as const };
        const tradeHistory = [nextTrade, ...(stored.tradeHistory ?? [])].slice(0, 10);
        await browser.storage.local.set({ tradeHistory });
        await broadcastRuntimeEvent({ type: "tradeRecorded", draft: nextTrade });
        return { ok: true, draft: nextTrade };
      }
      default:
        return { ok: false, error: "Unsupported Pareto runtime message." };
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown Pareto runtime error.",
    };
  }
}

async function readParetoState(): Promise<ParetoState> {
  const stored = await readStoredState();
  const selectedAddress = stored.selectedAddress ?? DEFAULT_SELECTED_ADDRESS;
  const watchlist = stored.watchlist ?? [];

  return {
    selectedEntity: getEntitySnapshot(selectedAddress, watchlist),
    watchlist,
    tradeHistory: stored.tradeHistory ?? [],
  };
}

async function readStoredState(): Promise<StoredParetoState> {
  return browser.storage.local.get(["selectedAddress", "watchlist", "tradeHistory"]);
}

async function enableSidePanelAction(): Promise<void> {
  const chromeApi = (globalThis as typeof globalThis & { chrome?: ChromeSidePanelApi }).chrome;

  try {
    await chromeApi?.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true });
  } catch {
    // Firefox/sidebar builds and older Chromium versions can safely ignore this demo affordance.
  }
}

async function broadcastRuntimeEvent(event: RuntimeEvent): Promise<void> {
  try {
    await browser.runtime.sendMessage(event);
  } catch {
    // No open extension view is a normal state.
  }
}

function toggleAddress(watchlist: string[], address: string): string[] {
  if (watchlist.includes(address)) {
    return watchlist.filter((item) => item !== address);
  }

  return [address, ...watchlist].slice(0, 20);
}
