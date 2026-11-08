import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export { cx };

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "outline" | "danger"; size?: "sm" | "md" };

export function Button({ variant = "outline", size = "md", className, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
        size === "md" ? "h-10 px-4 text-sm" : "h-8 px-3 text-[13px]",
        variant === "primary" && "bg-accent text-bg hover:brightness-110 font-semibold",
        variant === "outline" && "border border-line bg-transparent text-text hover:bg-raised",
        variant === "ghost" && "text-subtle hover:bg-raised hover:text-text",
        variant === "danger" && "border border-line text-bad hover:bg-bad/10",
        className,
      )}
    />
  );
}

export function IconButton({ label, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      {...rest}
      className={cx(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-text cursor-pointer disabled:opacity-40",
        className,
      )}
    />
  );
}

export function Card({ title, icon, action, children, className }: { title?: string; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-2xl border border-line bg-card p-5", className)}>
      {title && (
        <header className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
            {icon}
            {title}
          </h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Field({ label, hint, children, counter }: { label: string; hint?: string; children: ReactNode; counter?: string }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="flex items-center justify-between text-[13px] text-subtle">
        {label}
        {counter && <span className="text-xs text-muted tabular-nums">{counter}</span>}
      </span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function TextInput({ className, ...rest }: ComponentProps<"input">) {
  // Only stretch when the caller didn't set a width — otherwise `w-full` would win over e.g. `w-20`.
  const hasWidth = /(^|\s)w-/.test(className ?? "");
  return (
    <input
      {...rest}
      className={cx(
        !hasWidth && "w-full",
        "h-10 min-w-0 rounded-xl border border-line bg-panel px-3.5 text-sm text-text placeholder:text-muted/70 outline-none transition-colors focus:border-accent",
        className,
      )}
    />
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
      <span className="flex flex-col">
        <span className="text-sm text-text">{label}</span>
        {description && <span className="text-xs text-muted">{description}</span>}
      </span>
      <span className="relative inline-flex shrink-0">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-line transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-accent" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-text transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; icon?: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded-xl border border-line bg-panel p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx(
            "flex h-9 flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-[13px] font-medium transition-colors",
            o.value === value ? "bg-raised text-text shadow-sm" : "text-muted hover:text-text",
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className={cx(
        "h-10 min-w-0 cursor-pointer rounded-xl border border-line bg-panel px-3 text-sm text-text outline-none focus:border-accent",
        className,
      )}
    >
      {children}
    </select>
  );
}


export function ProfileBadge({ name, color, size = 32 }: { name: string; color: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-[10px] font-display font-semibold"
      style={{
        width: size,
        height: size,
        background: `color-mix(in oklab, ${color} 22%, #151620)`,
        color,
        fontSize: size * 0.42,
      }}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: ReactNode; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="text-[13px] text-muted">{eyebrow}</div>}
        <h1 className="mt-1 font-display text-[28px] font-semibold leading-tight tracking-tight">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
