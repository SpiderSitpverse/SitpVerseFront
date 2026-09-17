import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function TextField({ label, className, type = "text", id, ...props }: TextFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="block text-xs font-medium text-base-300">
        {label}
      </label>
      <div className="relative">
        <input
          id={fieldId}
          type={isPassword && revealed ? "text" : type}
          className={cn(
            "w-full rounded-lg border border-base-700 bg-base-900 px-3.5 py-2.5 text-sm text-base-100 placeholder:text-base-500 outline-none transition-colors focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/15",
            isPassword && "pr-10",
            className,
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setRevealed((v) => !v)}
            className="absolute right-2.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center text-base-400 transition-colors hover:text-base-200"
          >
            {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
