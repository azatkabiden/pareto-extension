import {
  Activity,
  AlertTriangle,
  ArrowDownUp,
  BadgeDollarSign,
  Copy,
  ExternalLink,
  Eye,
  Radio,
  RefreshCw,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { browser } from "wxt/browser";
import { truncateAddress } from "../../src/lib/addresses";
import {
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
  formatSol,
} from "../../src/lib/format";
import type {
  ParetoEntity,
  ParetoState,
  RuntimeEvent,
  RuntimeMessage,
  RuntimeResponse,
} from "../../src/lib/types";

const DEFAULT_TRADE = {
  amountSol: 0.25,
  slippageBps: 80,
  priorityFeeSol: 0.002,
};

export function SidePanel() {
  const [state, setState] = useState<ParetoState | null>(null);
  const [error, setError] = useState("");
  const [amountSol, setAmountSol] = useState(DEFAULT_TRADE.amountSol);
  const [slippageBps, setSlippageBps] = useState(DEFAULT_TRADE.slippageBps);
  const [priorityFeeSol, setPriorityFeeSol] = useState(DEFAULT_TRADE.priorityFeeSol);
  const [busySide, setBusySide] = useState<"buy" | "sell" | null>(null);

  const loadState = useCallback(async () => {
    const response = await sendMessage({ type: "getState" });
    if (response.ok && "state" in response) {
      setState(response.state);
      setError("");
      return;
    }

    setError(response.ok ? "Pareto state unavailable." : response.error);
  }, []);

  useEffect(() => {
    void loadState();

    const listener = (message: RuntimeEvent) => {
      if (
        message.type === "selectionChanged" ||
        message.type === "stateChanged" ||
        message.type === "tradeRecorded"
      ) {
        void loadState();
      }
    };

    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, [loadState]);

  async function toggleWatchlist(address: string) {
    const response = await sendMessage({ type: "toggleWatchlist", address });
    if (response.ok) {
      await loadState();
    }
  }

  async function simulate(side: "buy" | "sell") {
    if (!state) {
      return;
    }

    setBusySide(side);
    const simulated = await sendMessage({
      type: "simulateTrade",
      address: state.selectedEntity.address,
      side,
      amountSol,
      slippageBps,
      priorityFeeSol,
    });

    if (simulated.ok && "draft" in simulated) {
      await sendMessage({ type: "recordDemoTrade", draft: simulated.draft });
      await loadState();
    } else if (!simulated.ok) {
      setError(simulated.error);
    }

    setBusySide(null);
  }

  if (error) {
    return (
      <main className="shell">
        <Header />
        <section className="empty-state" aria-live="polite">
          <AlertTriangle aria-hidden="true" />
          <h1>Runtime unavailable</h1>
          <p>{error}</p>
          <button type="button" className="button primary" onClick={() => void loadState()}>
            <RefreshCw aria-hidden="true" />
            Retry
          </button>
        </section>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="shell">
        <Header />
        <section className="skeleton-stack" aria-label="Loading Pareto side panel">
          <div />
          <div />
          <div />
        </section>
      </main>
    );
  }

  const entity = state.selectedEntity;

  return (
    <main className="shell">
      <Header />
      <EntitySummary
        entity={entity}
        onToggleWatchlist={() => void toggleWatchlist(entity.address)}
      />

      <section className="panel trade-panel" aria-labelledby="trade-title">
        <div className="section-heading">
          <div>
            <p>Execution</p>
            <h2 id="trade-title">Trade simulation</h2>
          </div>
          <span className="fee-pill">0.1% fee</span>
        </div>

        <div className="field-grid">
          <label>
            Amount
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amountSol}
              onChange={(event) => setAmountSol(Number(event.target.value))}
              autoComplete="off"
            />
          </label>
          <label>
            Slippage bps
            <input
              type="number"
              min="10"
              max="1000"
              step="10"
              value={slippageBps}
              onChange={(event) => setSlippageBps(Number(event.target.value))}
              autoComplete="off"
            />
          </label>
          <label>
            Priority fee
            <input
              type="number"
              min="0"
              step="0.001"
              value={priorityFeeSol}
              onChange={(event) => setPriorityFeeSol(Number(event.target.value))}
              autoComplete="off"
            />
          </label>
        </div>

        <div className="button-row">
          <button
            type="button"
            className="button primary"
            disabled={busySide !== null}
            onClick={() => void simulate("buy")}
          >
            <ArrowDownUp aria-hidden="true" />
            {busySide === "buy" ? "Simulating" : "Buy"}
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={busySide !== null}
            onClick={() => void simulate("sell")}
          >
            <BadgeDollarSign aria-hidden="true" />
            {busySide === "sell" ? "Simulating" : "Sell"}
          </button>
        </div>
      </section>

      <section className="panel" aria-labelledby="cluster-title">
        <div className="section-heading">
          <div>
            <p>Alt-wallet detection</p>
            <h2 id="cluster-title">Linked cluster</h2>
          </div>
          <Users aria-hidden="true" />
        </div>
        <div className="cluster-list">
          {entity.relatedWallets.map((wallet) => (
            <div className="cluster-item" key={wallet.address}>
              <div>
                <code>{truncateAddress(wallet.address, 5)}</code>
                <span>{wallet.relation}</span>
              </div>
              <strong>{formatPercent(wallet.confidence)}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="ct-title">
        <div className="section-heading">
          <div>
            <p>Discourse tracker</p>
            <h2 id="ct-title">CT mentions</h2>
          </div>
          <Radio aria-hidden="true" />
        </div>
        <div className="mention-list">
          {entity.mentions.map((mention) => (
            <article className="mention" key={mention.id}>
              <div className="mention-meta">
                <span>{mention.handle}</span>
                <span>{mention.timestamp}</span>
              </div>
              <p>{mention.text}</p>
              <span className={`status status-${mention.status}`}>{mention.status}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="history-title">
        <div className="section-heading">
          <div>
            <p>Local proof</p>
            <h2 id="history-title">Demo trades</h2>
          </div>
          <Activity aria-hidden="true" />
        </div>
        {state.tradeHistory.length > 0 ? (
          <div className="history-list">
            {state.tradeHistory.slice(0, 4).map((trade) => (
              <div className="history-item" key={trade.id}>
                <span>{trade.side.toUpperCase()}</span>
                <strong>{formatSol(trade.amountSol)}</strong>
                <small>{trade.estimatedReceive}</small>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No simulated trades yet.</p>
        )}
      </section>
    </main>
  );
}

function Header() {
  return (
    <header className="app-header">
      <div>
        <p>Pareto</p>
        <h1>Trader overlay</h1>
      </div>
      <span className="network-pill">
        <ShieldCheck aria-hidden="true" />
        Demo-safe
      </span>
    </header>
  );
}

function EntitySummary({
  entity,
  onToggleWatchlist,
}: {
  entity: ParetoEntity;
  onToggleWatchlist: () => void;
}) {
  return (
    <section className="panel hero-panel" aria-labelledby="entity-title">
      <div className="entity-topline">
        <div>
          <p className="eyebrow">{entity.kind}</p>
          <h2 id="entity-title">{entity.displayName}</h2>
          <div className="address-row">
            <code>{truncateAddress(entity.address, 6)}</code>
            <button
              type="button"
              className="icon-button"
              aria-label="Copy selected address"
              onClick={() => void navigator.clipboard.writeText(entity.address)}
            >
              <Copy aria-hidden="true" />
            </button>
            <a
              className="icon-button"
              aria-label="Open selected address on Solscan"
              href={`https://solscan.io/account/${entity.address}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink aria-hidden="true" />
            </a>
          </div>
        </div>
        <button
          type="button"
          className={`watch-button ${entity.watchlisted ? "active" : ""}`}
          onClick={onToggleWatchlist}
        >
          {entity.watchlisted ? <Eye aria-hidden="true" /> : <Star aria-hidden="true" />}
          {entity.watchlisted ? "Watching" : "Watch"}
        </button>
      </div>

      <div className="label-row">
        {entity.labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="metric-grid">
        <Metric
          label="30d PnL"
          value={formatSignedCurrency(entity.pnl30dUsd)}
          intent={entity.pnl30dUsd >= 0 ? "good" : "bad"}
        />
        <Metric label="Win rate" value={formatPercent(entity.winRate)} />
        <Metric label="Balance" value={formatCurrency(entity.balanceUsd)} />
        <Metric
          label="Smart followers"
          value={`${entity.smartFollowers} +${entity.followersMomentum}`}
        />
      </div>

      <div className="risk-strip">
        <AlertTriangle aria-hidden="true" />
        <span>{entity.riskFlags[0]}</span>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  intent,
}: {
  label: string;
  value: string;
  intent?: "good" | "bad";
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong className={intent ? `metric-${intent}` : ""}>{value}</strong>
    </div>
  );
}

async function sendMessage(message: RuntimeMessage): Promise<RuntimeResponse> {
  try {
    return (await browser.runtime.sendMessage(message)) as RuntimeResponse;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Pareto background is not reachable.",
    };
  }
}
