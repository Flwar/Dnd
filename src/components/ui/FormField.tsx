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
    <div className={cn("space-y-2", className)}>
      <label htmlFor={id} className="block text-sm font-semibold text-[#e8dfce]">
        {label}{required ? <span className="me-1 text-[#d05b54]" aria-hidden="true">*</span> : null}
      </label>
      {children({
        id,
        "aria-describedby": error || hint ? descriptionId : undefined,
        "aria-invalid": error ? true : undefined,
      })}
      {error || hint ? (
        <p id={descriptionId} className={cn("text-sm", error ? "text-[#f28b83]" : "text-[#a89f91]")}>
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
}
