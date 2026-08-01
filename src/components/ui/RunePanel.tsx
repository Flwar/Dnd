import { cn } from "@/lib/cn";

type RunePanelProps = React.HTMLAttributes<HTMLElement> & {
  as?: "section" | "div" | "aside" | "article";
  title?: string;
  eyebrow?: string;
};

export function RunePanel({ as: Tag = "section", title, eyebrow, className, children, ...props }: RunePanelProps) {
  return (
    <Tag className={cn("stone-panel", className)} {...props}>
      {eyebrow || title ? (
        <header className="mb-4">
          {eyebrow ? <p className="mb-1 text-xs font-bold tracking-[0.22em] text-[#62c6df]">{eyebrow}</p> : null}
          {title ? <h2 className="display-font text-2xl text-[#f0cf82]">{title}</h2> : null}
        </header>
      ) : null}
      {children}
    </Tag>
  );
}
