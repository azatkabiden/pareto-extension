import type { LiveSolanaBalance } from "./types";

const DEFAULT_RPC_URL = "https://api.mainnet-beta.solana.com";
const LAMPORTS_PER_SOL = 1_000_000_000;

interface SolanaRpcBalanceResponse {
  result?: {
    context: {
      slot: number;
    };
    value: number;
  };
  error?: {
    message: string;
  };
}

export async function fetchLiveSolBalance(
  address: string,
  rpcUrl = DEFAULT_RPC_URL,
): Promise<LiveSolanaBalance> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "pareto-live-balance",
      method: "getBalance",
      params: [address],
    }),
  });

  if (!response.ok) {
    throw new Error(`Solana RPC returned HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as SolanaRpcBalanceResponse;
  if (payload.error) {
    throw new Error(payload.error.message);
  }

  if (!payload.result) {
    throw new Error("Solana RPC response did not include a balance result.");
  }

  return {
    address,
    cluster: "mainnet-beta",
    lamports: payload.result.value,
    sol: payload.result.value / LAMPORTS_PER_SOL,
    slot: payload.result.context.slot,
    fetchedAt: new Date().toISOString(),
    source: rpcUrl,
  };
}
