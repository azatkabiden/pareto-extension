import { fetchLiveSolBalance } from "./solana-rpc";

describe("Solana RPC helpers", () => {
  it("converts lamports from getBalance into SOL", async () => {
    const balance = await fetchLiveSolBalance(
      "11111111111111111111111111111111",
      "data:application/json,%7B%22result%22%3A%7B%22context%22%3A%7B%22slot%22%3A123%7D%2C%22value%22%3A2500000000%7D%7D",
    );

    expect(balance.sol).toBe(2.5);
    expect(balance.slot).toBe(123);
    expect(balance.cluster).toBe("mainnet-beta");
  });
});
