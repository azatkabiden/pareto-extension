import type { ParetoEntity, ParetoLabel, TradeDraft, TradeSide } from "./types";

export const DEFAULT_SELECTED_ADDRESS = "9xQeWvG816bUx9EPfVgJ8Nc7z5J1p6pMKJEyP5dZV9pQ";

const sharedMentions = [
  {
    id: "mention-axiom-1",
    author: "Northstar",
    handle: "@northstarSOL",
    token: "$PULSE",
    sentiment: "bullish" as const,
    status: "deleted" as const,
    timestamp: "12m ago",
    text: "Same deployer wallet funded two top holders before the first green candle.",
  },
  {
    id: "mention-gmgn-2",
    author: "Tape Reader",
    handle: "@tapereader",
    token: "$PULSE",
    sentiment: "neutral" as const,
    status: "live" as const,
    timestamp: "28m ago",
    text: "Watching the cluster. Smart followers are arriving before volume.",
  },
];

const demoEntities: Record<string, ParetoEntity> = {
  "9xQeWvG816bUx9EPfVgJ8Nc7z5J1p6pMKJEyP5dZV9pQ": {
    address: "9xQeWvG816bUx9EPfVgJ8Nc7z5J1p6pMKJEyP5dZV9pQ",
    kind: "wallet",
    displayName: "Northstar Treasury",
    labels: ["Smart Money", "High Conviction"],
    winRate: 0.86,
    pnl30dUsd: 248_430,
    balanceSol: 4_812.38,
    balanceUsd: 739_129,
    smartFollowers: 128,
    followersMomentum: 24,
    relatedWallets: [
      {
        address: "H8sQz5QxR6x2hH7c9w9cE7b5QhVKc2u8TR4oQV7y6uLa",
        relation: "same-exit",
        confidence: 0.91,
        pnl30dUsd: 82_104,
      },
      {
        address: "5YkX4v7qGkYmUfEJ9kHPV4qWYh7mDZCqWLwJx2Xz9uTR",
        relation: "copy-trader",
        confidence: 0.73,
        pnl30dUsd: 31_880,
      },
    ],
    riskFlags: ["Rotates positions under 18 minutes", "Exited 4 promoted tokens before CT peak"],
    mentions: sharedMentions,
    watchlisted: false,
    lastUpdated: "8s ago",
  },
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
    address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    kind: "token",
    displayName: "USDC Mint",
    labels: ["Risk Watch"],
    winRate: 0.52,
    pnl30dUsd: 14_920,
    balanceSol: 0,
    balanceUsd: 1_000_000,
    smartFollowers: 42,
    followersMomentum: 6,
    relatedWallets: [
      {
        address: "7RkQ6czKJ5wZLD6KCMF6y8KJY5nNtQwQp6sQmYWdkJ9u",
        relation: "funded-by",
        confidence: 0.68,
        pnl30dUsd: 18_204,
      },
    ],
    riskFlags: ["Reference token in demo fixture", "Use as quote-side liquidity only"],
    mentions: [
      {
        id: "mention-usdc-1",
        author: "Liquidity Desk",
        handle: "@liqdesk",
        token: "USDC",
        sentiment: "neutral",
        status: "live",
        timestamp: "1h ago",
        text: "Quote liquidity stable; no unusual mint-side pressure in tracked pairs.",
      },
    ],
    watchlisted: false,
    lastUpdated: "14s ago",
  },
  DezXAZ8z7PnrnRJjz3tJkqJuuXbhS5uh3ndet2qtSk: {
    address: "DezXAZ8z7PnrnRJjz3tJkqJuuXbhS5uh3ndet2qtSk",
    kind: "token",
    displayName: "BONK Momentum Cluster",
    labels: ["KOL", "Risk Watch"],
    winRate: 0.64,
    pnl30dUsd: 66_710,
    balanceSol: 212.1,
    balanceUsd: 111_400,
    smartFollowers: 77,
    followersMomentum: 19,
    relatedWallets: [
      {
        address: "A5bG9VqT8mKp2zXc6YwQn3dR4sF7uLhJ2tMe8Pg6VxSa",
        relation: "shared-deployer",
        confidence: 0.79,
        pnl30dUsd: -12_200,
      },
    ],
    riskFlags: [
      "Two KOL mentions deleted after sell pressure",
      "Cluster bought before public call",
    ],
    mentions: sharedMentions,
    watchlisted: false,
    lastUpdated: "5s ago",
  },
};

export function getDemoAddresses(): string[] {
  return Object.keys(demoEntities);
}

export function getEntitySnapshot(address: string, watchlist: string[] = []): ParetoEntity {
  const entity = demoEntities[address] ?? buildFallbackEntity(address);
  return {
    ...entity,
    watchlisted: watchlist.includes(address),
  };
}

export function simulateParetoTrade(
  address: string,
  side: TradeSide,
  amountSol: number,
  slippageBps: number,
  priorityFeeSol: number,
): TradeDraft {
  const safeAmount = Math.max(0.01, Number.isFinite(amountSol) ? amountSol : 0.25);
  const safeSlippage = Math.min(
    1_000,
    Math.max(10, Number.isFinite(slippageBps) ? slippageBps : 80),
  );
  const safePriorityFee = Math.max(0, Number.isFinite(priorityFeeSol) ? priorityFeeSol : 0.002);
  const paretoFee = safeAmount * 0.001;

  return {
    id: `trade-${Date.now()}-${stableHash(address).toString(16)}`,
    side,
    targetAddress: address,
    amountSol: round(safeAmount, 4),
    slippageBps: safeSlippage,
    priorityFeeSol: round(safePriorityFee, 5),
    estimatedParetoFeeSol: round(paretoFee, 5),
    estimatedReceive:
      side === "buy"
        ? `${round(safeAmount * 19_800 * (1 - safeSlippage / 10_000), 2)} target units`
        : `${round(safeAmount * 0.997 - paretoFee - safePriorityFee, 4)} SOL`,
    route: ["Pareto local guard", "Jupiter route simulation", "0.1% flat-fee preview"],
    status: "simulated",
    createdAt: new Date().toISOString(),
  };
}

function buildFallbackEntity(address: string): ParetoEntity {
  const hash = stableHash(address);
  const labels = pickLabels(hash);
  const pnl = ((hash % 180_000) - 45_000) * (hash % 2 === 0 ? 1 : -1);
  const followers = 12 + (hash % 86);

  return {
    address,
    kind: hash % 3 === 0 ? "token" : "wallet",
    displayName: labels.includes("Insider") ? "Unlabeled Insider Cluster" : "Unlabeled Wallet",
    labels,
    winRate: round(0.48 + (hash % 42) / 100, 2),
    pnl30dUsd: pnl,
    balanceSol: round(18 + (hash % 5_300) / 10, 2),
    balanceUsd: round(3_200 + (hash % 390_000), 0),
    smartFollowers: followers,
    followersMomentum: hash % 31,
    relatedWallets: [
      {
        address: rotateAddress(address),
        relation: hash % 2 === 0 ? "funded-by" : "same-exit",
        confidence: round(0.58 + (hash % 37) / 100, 2),
        pnl30dUsd: (hash % 72_000) - 18_000,
      },
    ],
    riskFlags:
      hash % 2 === 0
        ? ["Fresh funding source", "High same-block exit correlation"]
        : ["Low liquidity interaction", "Watch for KOL deletion pattern"],
    mentions: [
      {
        id: `mention-${hash}`,
        author: "Pareto Demo Index",
        handle: "@pareto_demo",
        token: "$LOCAL",
        sentiment: hash % 2 === 0 ? "bullish" : "neutral",
        status: hash % 5 === 0 ? "deleted" : "live",
        timestamp: `${5 + (hash % 45)}m ago`,
        text: "Local deterministic profile generated for an unknown Solana-like address.",
      },
    ],
    watchlisted: false,
    lastUpdated: `${3 + (hash % 21)}s ago`,
  };
}

function pickLabels(hash: number): ParetoLabel[] {
  const pool: ParetoLabel[] = [
    "Smart Money",
    "KOL",
    "Insider",
    "Fresh Wallet",
    "Dev Cluster",
    "High Conviction",
    "Risk Watch",
  ];
  const first = pool[hash % pool.length];
  const second = pool[(hash >> 3) % pool.length];
  return first === second ? [first] : [first, second];
}

function rotateAddress(address: string): string {
  return `${address.slice(8)}${address.slice(0, 8)}`.slice(0, 44);
}

function stableHash(input: string): number {
  let hash = 2166136261;
  for (const character of input) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function round(value: number, digits: number): number {
  return Number(value.toFixed(digits));
}
