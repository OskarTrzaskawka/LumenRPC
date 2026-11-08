import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LoaderCircle } from "lucide-react";
import { useEngine } from "./lib/engine";
import { useTrayBridge } from "./lib/trayBridge";
import { platform } from "./lib/platform";
import { useStore } from "./lib/store";
import type { Page } from "./lib/types";
import { Sidebar } from "./components/Sidebar";
import { Palette } from "./components/Palette";
import { Toasts } from "./components/Toasts";
import { Connect } from "./pages/Connect";
import { Editor } from "./pages/Editor";
import { Automations } from "./pages/Automations";
import { Schedule } from "./pages/Schedule";
import { Gallery } from "./pages/Gallery";
import { SettingsPage } from "./pages/Settings";

/** Browser demo deep link straight into the app, e.g. ?demo=app&page=automations (used for screenshots). */
const DEMO_APP = platform.isDemo && new URLSearchParams(location.search).get("demo") === "app";

/** Wires host events (status, tray, shortcuts) into the store. */
function useHostBridge() {
  const loaded = useStore((s) => s.loaded);
  const clientId = useStore((s) => s.clientId);
  const state = useStore((s) => s.status.state);
  const accent = useStore((s) => s.settings.accent);
  const closeToTray = useStore((s) => s.settings.closeToTray);
  const shortcut = useStore((s) => s.settings.shortcut);

  // Auto-connect once the saved state has been loaded.
  useEffect(() => {
    if (!loaded) return;
    const s = useStore.getState();
    // Browser demo deep links, e.g. ?demo=app&page=automations (used for screenshots).
    if (DEMO_APP) {
      const page = new URLSearchParams(location.search).get("page");
      if (page) s.setPage(page as Page);
      s.setClientId("1234567890123456789", { id: "1234567890123456789", name: "Lumen RPC", icon: null });
      s.setStatus({ state: "connected", user: { id: "1", username: "lumen_demo", global_name: "You (demo)", avatar: null } });
      return;
    }
    if (s.clientId && s.settings.autoConnect && s.status.state === "disconnected") void platform.connect(s.clientId).catch(() => {});
  }, [loaded]);

  useEffect(() => {
    const offs = [
      platform.onStatus((status) => useStore.getState().setStatus(status)),
      platform.onActivityResult((r) => useStore.setState({ lastResult: { ...r, at: Date.now() } })),
      platform.onTrayClear(() => useStore.getState().setPaused(true)),
      platform.onOpenPalette(() => useStore.setState({ paletteOpen: true })),
    ];
    if (!DEMO_APP) void platform.status().then((st) => useStore.getState().setStatus(st));
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        useStore.setState({ paletteOpen: !useStore.getState().paletteOpen });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      offs.forEach((off) => off());
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // Load the application's name, icon and uploaded images once connected.
  useEffect(() => {
    if (state !== "connected" || !clientId) return;
    void platform.fetchApp(clientId).then((app) => {
      if (app) {
        useStore.setState({ app });
        useStore.getState().setClientId(clientId, app);
      } else if (!useStore.getState().app) {
        useStore.setState({ app: { id: clientId, name: useStore.getState().recentClients.find((r) => r.id === clientId)?.name ?? "Your application", icon: null } });
      }
    });
    void platform.fetchAssets(clientId).then((assets) => useStore.setState({ assets }));
  }, [state, clientId]);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", accent);
  }, [accent]);

  useEffect(() => {
    void platform.setCloseToTray(closeToTray);
  }, [closeToTray]);

  useEffect(() => {
    let off: (() => void) | undefined;
    platform
      .registerShortcut(shortcut, () => useStore.setState({ paletteOpen: true }))
      .then((u) => (off = u))
      .catch(() => {});
    return () => off?.();
  }, [shortcut]);
}

const PAGES = { editor: Editor, automations: Automations, schedule: Schedule, gallery: Gallery, settings: SettingsPage };

export default function App() {
  const loaded = useStore((s) => s.loaded);
  const status = useStore((s) => s.status);
  const clientId = useStore((s) => s.clientId);
  const page = useStore((s) => s.page);
  useHostBridge();
  useEngine();
  useTrayBridge();

  if (!loaded) return null;

  const needsConnect = !clientId || status.state === "disconnected" || status.state === "error";
  const Page = PAGES[page];

  return (
    <div className="flex h-full flex-col">
      {platform.isDemo && (
        <div className="flex h-8 shrink-0 items-center justify-center bg-accent/15 text-xs text-subtle">
          Browser demo — the Discord connection is simulated. Download the desktop app to go live.
        </div>
      )}
      <AnimatePresence mode="wait">
        {needsConnect ? (
          <motion.div key="connect" className="min-h-0 flex-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Connect />
          </motion.div>
        ) : (
          <motion.div key="app" className="flex min-h-0 flex-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Sidebar />
            <main className="flex min-w-0 flex-1 flex-col">
              {status.state === "connecting" && (
                <div role="status" className="flex items-center gap-2 border-b border-line bg-warn/10 px-6 py-2.5 text-[13px] text-warn">
                  <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
                  {status.message ?? "Connecting to Discord…"} Make sure the Discord desktop app is open.
                </div>
              )}
              <AnimatePresence mode="wait">
                <motion.div
                  key={page}
                  className="flex min-h-0 flex-1"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16 }}
                >
                  <Page />
                </motion.div>
              </AnimatePresence>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
      <Palette />
      <Toasts />
    </div>
  );
}
