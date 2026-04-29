import React from "react";
import { createRoot } from "react-dom/client";
import { SidePanel } from "./side-panel";
import "./style.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Pareto side panel root was not found.");
}

createRoot(root).render(
  <React.StrictMode>
    <SidePanel />
  </React.StrictMode>,
);
