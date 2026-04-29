import { getEntitySnapshot, simulateParetoTrade } from "./fixtures";

describe("Pareto fixtures", () => {
  it("returns deterministic fallback intelligence for unknown addresses", () => {
    const address = "6du2tR9qVAGGdyG8bCq3Cyeu8S2rYwbSqUf6QmYWk2xF";

    expect(getEntitySnapshot(address)).toEqual(getEntitySnapshot(address));
  });

  it("simulates a demo trade without creating a real transaction", () => {
    const draft = simulateParetoTrade(
      "9xQeWvG816bUx9EPfVgJ8Nc7z5J1p6pMKJEyP5dZV9pQ",
      "buy",
      1,
      80,
      0.002,
    );

    expect(draft.status).toBe("simulated");
    expect(draft.estimatedParetoFeeSol).toBe(0.001);
    expect(draft.route).toContain("0.1% flat-fee preview");
  });
});
