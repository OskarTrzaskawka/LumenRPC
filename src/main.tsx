import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initPersistence } from "./lib/store";
import "./index.css";

void initPersistence();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
