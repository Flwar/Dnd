import { cn } from "@/lib/cn";

type RunePanelProps = React.HTMLAttributes<HTMLElement> & {
  as?: "section" | "div" | "aside" | "article";
  title?: string;
  eyebrow?: string;
};

export function RunePanel({ as: Tag = "section", title, eyebrow, className, children, ...props }: RunePanelProps) {
  return (
    <Tag className={cn("rune-panel stone-panel", className)} {...props}>
      <span className="rune-panel__glow" aria-hidden="true" />
      {eyebrow || title ? (
        <header className="mb-5 flex items-center gap-4 border-b border-[#c6a15b]/15 pb-4">
          <span className="rune-panel__sigil shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            {eyebrow ? <p className="mb-1 text-xs font-bold tracking-[0.22em] text-[#78d3e6]">{eyebrow}</p> : null}
            {title ? <h2 className="display-font text-2xl leading-tight text-[#f0cf82]">{title}</h2> : null}
          </div>
        </header>
      ) : null}
      <div className="relative z-[1]">{children}</div>
    </Tag>
  );
}
