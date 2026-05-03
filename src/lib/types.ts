export type EntityKind = "wallet" | "token" | "contract";

export type ParetoLabel =
  | "Smart Money"
  | "KOL"
  | "Insider"
  | "Fresh Wallet"
  | "Dev Cluster"
  | "High Conviction"
  | "Risk Watch";

export type MentionStatus = "live" | "deleted" | "edited";

export interface ParetoMention {
  id: string;
  author: string;
  handle: string;
  token: string;
  sentiment: "bullish" | "neutral" | "bearish";
  status: MentionStatus;
  timestamp: string;
  text: string;
}

export interface RelatedWallet {
  address: string;
  relation: "funded-by" | "shared-deployer" | "same-exit" | "copy-trader";
  confidence: number;
  pnl30dUsd: number;
}

export interface ParetoEntity {
  address: string;
  kind: EntityKind;
  displayName: string;
  labels: ParetoLabel[];
  winRate: number;
  pnl30dUsd: number;
  balanceSol: number;
  balanceUsd: number;
  smartFollowers: number;
  followersMomentum: number;
  relatedWallets: RelatedWallet[];
  riskFlags: string[];
  mentions: ParetoMention[];
  watchlisted: boolean;
  lastUpdated: string;
}

export interface LiveSolanaBalance {
  address: string;
  cluster: "mainnet-beta";
  lamports: number;
  sol: number;
  slot: number;
  fetchedAt: string;
  source: string;
}

export type TradeSide = "buy" | "sell";
export type TradeStatus = "draft" | "simulated" | "recorded";

export interface TradeDraft {
  id: string;
  side: TradeSide;
  targetAddress: string;
  amountSol: number;
  slippageBps: number;
  priorityFeeSol: number;
  estimatedParetoFeeSol: number;
  estimatedReceive: string;
  route: string[];
  status: TradeStatus;
  createdAt: string;
}

export interface ParetoState {
  selectedEntity: ParetoEntity;
  liveBalance?: LiveSolanaBalance;
  watchlist: string[];
  tradeHistory: TradeDraft[];
}

export type RuntimeMessage =
  | { type: "getState" }
  | { type: "getEntity"; address: string }
  | { type: "selectEntity"; address: string }
  | { type: "refreshLiveBalance"; address: string }
  | { type: "toggleWatchlist"; address: string }
  | {
      type: "simulateTrade";
      address: string;
      side: TradeSide;
      amountSol: number;
      slippageBps: number;
      priorityFeeSol: number;
    }
  | { type: "recordDemoTrade"; draft: TradeDraft };

export type RuntimeEvent =
  | { type: "selectionChanged"; address: string }
  | { type: "stateChanged" }
  | { type: "tradeRecorded"; draft: TradeDraft };

export type RuntimeResponse =
  | { ok: true; state: ParetoState }
  | { ok: true; entity: ParetoEntity }
  | { ok: true; liveBalance: LiveSolanaBalance }
  | { ok: true; draft: TradeDraft }
  | { ok: false; error: string };
