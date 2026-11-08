import { useStore } from "../lib/store";
import { assetUrl } from "../lib/activity";
import { TextInput, cx } from "./ui";
import { ImageIcon } from "lucide-react";

/** Pick an uploaded Art Asset by key, or paste any https:// image URL. */
export function ImagePicker({ value, onChange, label, round }: { value: string; onChange: (v: string) => void; label: string; round?: boolean }) {
  const app = useStore((s) => s.app);
  const assets = useStore((s) => s.assets);
  const preview = assetUrl(value, app?.id, assets);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div
          className={cx("flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden bg-raised text-muted", round ? "rounded-full" : "rounded-xl")}
        >
          {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <ImageIcon size={18} aria-hidden="true" />}
        </div>
        <TextInput aria-label={label} placeholder="Asset key or https:// image URL" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
      {assets.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label={`${label}: uploaded assets`}>
          {assets.slice(0, 14).map((a) => {
            const selected = value.trim().toLowerCase() === a.name.toLowerCase();
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onChange(selected ? "" : a.name)}
                className={cx(
                  "flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-2 text-xs transition-colors",
                  selected ? "border-accent bg-accent/15 text-text" : "border-line text-subtle hover:bg-raised",
                )}
              >
                {app && /^\d+$/.test(a.id) ? (
                  <img src={`https://cdn.discordapp.com/app-assets/${app.id}/${a.id}.png?size=32`} alt="" className="h-5 w-5 rounded" />
                ) : (
                  <span className="h-5 w-5 rounded bg-line" />
                )}
                {a.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
