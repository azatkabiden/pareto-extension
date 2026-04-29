import { extractSolanaAddresses, isSolanaAddressLike, truncateAddress } from "./addresses";

describe("address helpers", () => {
  it("extracts unique Solana-like addresses from mixed text", () => {
    const text =
      "Watch 9xQeWvG816bUx9EPfVgJ8Nc7z5J1p6pMKJEyP5dZV9pQ and 9xQeWvG816bUx9EPfVgJ8Nc7z5J1p6pMKJEyP5dZV9pQ.";

    expect(extractSolanaAddresses(text)).toEqual(["9xQeWvG816bUx9EPfVgJ8Nc7z5J1p6pMKJEyP5dZV9pQ"]);
  });

  it("rejects invalid base58 characters", () => {
    expect(isSolanaAddressLike("00000000000000000000000000000000")).toBe(false);
    expect(isSolanaAddressLike("9xQeWvG816bUx9EPfVgJ8Nc7z5J1p6pMKJEyP5dZV9pQ")).toBe(true);
  });

  it("truncates addresses for compact trading UI", () => {
    expect(truncateAddress("9xQeWvG816bUx9EPfVgJ8Nc7z5J1p6pMKJEyP5dZV9pQ")).toBe("9xQe...V9pQ");
  });
});
