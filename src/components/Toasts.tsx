import { AnimatePresence, motion } from "motion/react";
import { CircleCheck, CircleAlert, Info } from "lucide-react";
import { useStore } from "../lib/store";

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 24 }}
            className="flex items-center gap-2.5 rounded-xl border border-line bg-raised px-4 py-3 text-sm shadow-xl shadow-black/40"
          >
            {t.tone === "ok" && <CircleCheck size={17} className="text-ok" aria-hidden="true" />}
            {t.tone === "error" && <CircleAlert size={17} className="text-bad" aria-hidden="true" />}
            {t.tone === "info" && <Info size={17} className="text-accent" aria-hidden="true" />}
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
