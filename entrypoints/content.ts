import { browser } from "wxt/browser";
import { defineContentScript } from "wxt/utils/define-content-script";
import { extractSolanaAddresses, truncateAddress } from "../src/lib/addresses";
import { formatPercent, formatSignedCurrency, formatSol } from "../src/lib/format";
import type { ParetoEntity, RuntimeMessage, RuntimeResponse, TradeSide } from "../src/lib/types";

const SCAN_DEBOUNCE_MS = 250;
const PARETO_ROOT_ID = "pareto-extension-root";
const SKIP_SELECTOR =
  "script, style, textarea, input, select, option, button, [contenteditable='true'], .pareto-address-badge, #pareto-extension-root";

export default defineContentScript({
  matches: [
    "*://x.com/*",
    "*://twitter.com/*",
    "*://*.solscan.io/*",
    "*://solscan.io/*",
    "*://*.gmgn.ai/*",
    "*://gmgn.ai/*",
    "*://*.dexscreener.com/*",
    "*://dexscreener.com/*",
    "*://pump.fun/*",
    "*://*.pump.fun/*",
    "*://*.axiom.trade/*",
    "*://axiom.trade/*",
    "http://127.0.0.1:*/*",
    "http://localhost:*/*",
  ],
  runAt: "document_idle",
  main() {
    installStyles();
    installInspectorRoot();
    scanDocument();

    let timer: number | undefined;
    const observer = new MutationObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(scanDocument, SCAN_DEBOUNCE_MS);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  },
});

function scanDocument(): void {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || parent.closest(SKIP_SELECTOR)) {
        return NodeFilter.FILTER_REJECT;
      }

      return extractSolanaAddresses(node.textContent ?? "").length > 0
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  const nodes: Text[] = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Text);
  }

  for (const node of nodes) {
    decorateTextNode(node);
  }
}

function decorateTextNode(node: Text): void {
  const text = node.textContent ?? "";
  const matches = extractSolanaAddresses(text);
  if (matches.length === 0) {
    return;
  }

  const fragment = document.createDocumentFragment();
  let cursor = 0;

  for (const address of matches) {
    const index = text.indexOf(address, cursor);
    if (index < 0) {
      continue;
    }

    fragment.append(text.slice(cursor, index));
    fragment.append(createBadge(address));
    cursor = index + address.length;
  }

  fragment.append(text.slice(cursor));
  node.replaceWith(fragment);
}

function createBadge(address: string): HTMLButtonElement {
  const badge = document.createElement("button");
  badge.type = "button";
  badge.className = "pareto-address-badge";
  badge.dataset.paretoAddress = address;
  badge.setAttribute("aria-label", `Inspect ${address} in Pareto`);
  badge.textContent = truncateAddress(address);

  badge.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    await selectEntity(address);
  });

  return badge;
}

async function selectEntity(address: string): Promise<void> {
  const response = await sendRuntimeMessage({ type: "selectEntity", address });
  if (response.ok && "entity" in response) {
    renderInspector(response.entity);
  }
}

async function renderInspector(entity: ParetoEntity): Promise<void> {
  const root = installInspectorRoot();
  root.replaceChildren();
  root.classList.add("pareto-inspector-active");

  const panel = element("section", "pareto-inspector");
  panel.setAttribute("aria-label", "Pareto wallet intelligence");

  const header = element("header", "pareto-inspector-header");
  const titleWrap = element("div");
  titleWrap.append(
    element("p", "pareto-kicker", "Pareto"),
    element("h2", "", entity.displayName),
    element("code", "", truncateAddress(entity.address, 6)),
  );

  const closeButton = element("button", "pareto-icon-button", "x") as HTMLButtonElement;
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close Pareto inspector");
  closeButton.addEventListener("click", () => root.classList.remove("pareto-inspector-active"));
  header.append(titleWrap, closeButton);

  const labelRow = element("div", "pareto-label-row");
  for (const label of entity.labels) {
    labelRow.append(element("span", "pareto-label", label));
  }

  const metrics = element("div", "pareto-metrics");
  metrics.append(
    metric("30d PnL", formatSignedCurrency(entity.pnl30dUsd)),
    metric("Win rate", formatPercent(entity.winRate)),
    metric("Balance", formatSol(entity.balanceSol)),
    metric("Smart followers", `+${entity.followersMomentum} / ${entity.smartFollowers}`),
  );

  const risks = element("ul", "pareto-risk-list");
  for (const flag of entity.riskFlags) {
    risks.append(element("li", "", flag));
  }

  const mentions = element("div", "pareto-mentions");
  for (const mention of entity.mentions.slice(0, 2)) {
    const item = element("article", "pareto-mention");
    item.append(
      element("div", "pareto-mention-meta", `${mention.handle} · ${mention.timestamp}`),
      element("p", "", mention.text),
      element("span", `pareto-status pareto-status-${mention.status}`, mention.status),
    );
    mentions.append(item);
  }

  const actions = element("div", "pareto-actions");
  actions.append(
    actionButton("Sim buy", "buy", entity.address),
    actionButton("Sim sell", "sell", entity.address),
    watchButton(entity),
  );

  panel.append(header, labelRow, metrics, element("h3", "", "Risk flags"), risks);
  panel.append(element("h3", "", "CT context"), mentions, actions);
  root.append(panel);
}

function actionButton(label: string, side: TradeSide, address: string): HTMLButtonElement {
  const button = element("button", "pareto-action", label) as HTMLButtonElement;
  button.type = "button";
  button.addEventListener("click", async () => {
    button.disabled = true;
    const response = await sendRuntimeMessage({
      type: "simulateTrade",
      address,
      side,
      amountSol: 0.25,
      slippageBps: 80,
      priorityFeeSol: 0.002,
    });

    if (response.ok && "draft" in response) {
      await sendRuntimeMessage({ type: "recordDemoTrade", draft: response.draft });
      button.textContent = `${side === "buy" ? "Buy" : "Sell"} simulated`;
    } else {
      button.textContent = "Retry";
    }

    button.disabled = false;
  });

  return button;
}

function watchButton(entity: ParetoEntity): HTMLButtonElement {
  const button = element(
    "button",
    "pareto-action pareto-action-secondary",
    entity.watchlisted ? "Watching" : "Watch",
  ) as HTMLButtonElement;
  button.type = "button";
  button.addEventListener("click", async () => {
    const response = await sendRuntimeMessage({ type: "toggleWatchlist", address: entity.address });
    if (response.ok && "entity" in response) {
      await renderInspector(response.entity);
    }
  });
  return button;
}

async function sendRuntimeMessage(message: RuntimeMessage): Promise<RuntimeResponse> {
  try {
    return (await browser.runtime.sendMessage(message)) as RuntimeResponse;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Pareto runtime unavailable.",
    };
  }
}

function metric(label: string, value: string): HTMLElement {
  const item = element("div", "pareto-metric");
  item.append(element("span", "", label), element("strong", "", value));
  return item;
}

function installInspectorRoot(): HTMLElement {
  const existing = document.getElementById(PARETO_ROOT_ID);
  if (existing) {
    return existing;
  }

  const root = document.createElement("div");
  root.id = PARETO_ROOT_ID;
  document.documentElement.append(root);
  return root;
}

function element(tagName: string, className = "", text = ""): HTMLElement {
  const item = document.createElement(tagName);
  if (className) {
    item.className = className;
  }
  if (text) {
    item.textContent = text;
  }
  return item;
}

function installStyles(): void {
  if (document.getElementById("pareto-extension-styles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "pareto-extension-styles";
  style.textContent = `
    .pareto-address-badge {
      align-items: center;
      appearance: none;
      background: #0b1715;
      border: 1px solid #2fd6a3;
      border-radius: 6px;
      color: #c8ffe9;
      cursor: pointer;
      display: inline-flex;
      font: 600 12px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
      gap: 4px;
      margin: 0 2px;
      min-height: 24px;
      padding: 3px 6px;
      vertical-align: baseline;
    }

    .pareto-address-badge::before {
      color: #2fd6a3;
      content: "P";
      font-weight: 800;
    }

    .pareto-address-badge:focus-visible,
    .pareto-action:focus-visible,
    .pareto-icon-button:focus-visible {
      outline: 2px solid #9ff7d0;
      outline-offset: 2px;
    }

    #pareto-extension-root {
      color-scheme: dark;
      pointer-events: none;
      position: fixed;
      z-index: 2147483647;
    }

    #pareto-extension-root.pareto-inspector-active {
      inset: 0;
      pointer-events: auto;
    }

    .pareto-inspector {
      background: #07100f;
      border: 1px solid #23453f;
      border-radius: 8px;
      bottom: 18px;
      box-shadow: 0 18px 60px rgb(0 0 0 / 45%);
      color: #ecfff7;
      font-family: Inter, ui-sans-serif, system-ui, sans-serif;
      max-height: min(680px, calc(100vh - 36px));
      overflow: auto;
      padding: 16px;
      position: fixed;
      right: 18px;
      width: min(380px, calc(100vw - 36px));
    }

    .pareto-inspector-header,
    .pareto-label-row,
    .pareto-actions {
      align-items: center;
      display: flex;
      gap: 8px;
    }

    .pareto-inspector-header {
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .pareto-inspector h2,
    .pareto-inspector h3,
    .pareto-inspector p,
    .pareto-inspector ul {
      margin: 0;
    }

    .pareto-inspector h2 {
      font-size: 16px;
      line-height: 1.2;
    }

    .pareto-inspector h3 {
      color: #9fbab0;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0;
      margin-top: 14px;
      text-transform: uppercase;
    }

    .pareto-inspector code {
      color: #9fbab0;
      display: block;
      font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
      margin-top: 4px;
    }

    .pareto-kicker {
      color: #2fd6a3;
      font-size: 12px;
      font-weight: 800;
      margin-bottom: 4px;
    }

    .pareto-icon-button {
      background: #10201e;
      border: 1px solid #23453f;
      border-radius: 6px;
      color: #ecfff7;
      cursor: pointer;
      font: 700 14px/1 ui-sans-serif, system-ui, sans-serif;
      height: 40px;
      width: 40px;
    }

    .pareto-label-row {
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .pareto-label,
    .pareto-status {
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 7px;
    }

    .pareto-label {
      background: #12332c;
      color: #9ff7d0;
    }

    .pareto-metrics {
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .pareto-metric {
      background: #0d1a18;
      border: 1px solid #1a342f;
      border-radius: 8px;
      padding: 10px;
    }

    .pareto-metric span {
      color: #9fbab0;
      display: block;
      font-size: 11px;
      margin-bottom: 4px;
    }

    .pareto-metric strong {
      color: #ecfff7;
      font: 700 14px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
    }

    .pareto-risk-list {
      color: #d7e6df;
      display: grid;
      font-size: 12px;
      gap: 6px;
      padding-left: 18px;
    }

    .pareto-mentions {
      display: grid;
      gap: 8px;
      margin-top: 8px;
    }

    .pareto-mention {
      background: #0d1a18;
      border: 1px solid #1a342f;
      border-radius: 8px;
      padding: 10px;
    }

    .pareto-mention p {
      color: #d7e6df;
      font-size: 12px;
      line-height: 1.45;
      margin-top: 4px;
    }

    .pareto-mention-meta {
      color: #9fbab0;
      font: 600 11px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
    }

    .pareto-status {
      background: #24342f;
      color: #c3d6cf;
      display: inline-flex;
      margin-top: 8px;
    }

    .pareto-status-deleted {
      background: #3b1718;
      color: #ffb8b8;
    }

    .pareto-actions {
      margin-top: 14px;
    }

    .pareto-action {
      background: #2fd6a3;
      border: 0;
      border-radius: 8px;
      color: #05110e;
      cursor: pointer;
      flex: 1;
      font: 800 12px/1 ui-sans-serif, system-ui, sans-serif;
      min-height: 40px;
      padding: 0 10px;
    }

    .pareto-action:disabled {
      cursor: wait;
      opacity: 0.7;
    }

    .pareto-action-secondary {
      background: #10201e;
      border: 1px solid #23453f;
      color: #ecfff7;
    }

    @media (prefers-reduced-motion: no-preference) {
      .pareto-address-badge,
      .pareto-action,
      .pareto-icon-button {
        transition: background-color 140ms ease, border-color 140ms ease, transform 140ms ease;
      }

      .pareto-address-badge:hover,
      .pareto-action:hover {
        transform: translateY(-1px);
      }
    }
  `;
  document.documentElement.append(style);
}
