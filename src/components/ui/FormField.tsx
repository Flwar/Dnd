import { useId } from "react";
import { cn } from "@/lib/cn";

type FormFieldProps = {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: true }) => React.ReactNode;
  className?: string;
};

export function FormField({ label, error, hint, required, children, className }: FormFieldProps) {
  const id = useId();
  const descriptionId = `${id}-description`;
  return (
    <div className={cn("group/field space-y-2", className)}>
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-semibold text-[#e8dfce] transition-colors group-focus-within/field:text-[#f4d58f]">
        <span className="size-1.5 rotate-45 border border-[#c6a15b]/55 bg-[#c6a15b]/15" aria-hidden="true" />
        {label}{required ? <span className="me-1 text-[#d05b54]" aria-hidden="true">*</span> : null}
      </label>
      {children({
        id,
        "aria-describedby": error || hint ? descriptionId : undefined,
        "aria-invalid": error ? true : undefined,
      })}
      {error || hint ? (
        <p id={descriptionId} className={cn("border-s ps-2 text-sm leading-6", error ? "border-[#d05b54]/55 text-[#f49b94]" : "border-[#c6a15b]/22 text-[#a89f91]")}>
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
}
