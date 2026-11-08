import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initPersistence } from "./lib/store";
import "./index.css";

const TrayPanel = lazy(() => import("./tray/TrayPanel").then((m) => ({ default: m.TrayPanel })));
const isTrayPanel = new URLSearchParams(location.search).get("view") === "tray";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

if (isTrayPanel) {
  // The tray panel is a separate, transparent window that only mirrors the main window's state.
  document.documentElement.classList.add("tray");
  root.render(
    <Suspense>
      <TrayPanel />
    </Suspense>,
  );
} else {
  void initPersistence();
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
