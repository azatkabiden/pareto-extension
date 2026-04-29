import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Pareto",
    short_name: "Pareto",
    description:
      "Demo-safe Solana trader overlay with wallet intelligence, CT context, and simulated execution.",
    version: "0.1.0",
    permissions: ["storage", "sidePanel"],
    host_permissions: ["<all_urls>"],
    action: {
      default_title: "Open Pareto",
    },
  },
});
