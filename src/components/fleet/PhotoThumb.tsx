import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function PhotoThumb({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex aspect-video items-center justify-center rounded-lg bg-gradient-to-br from-base-800 to-base-900 text-base-500 ring-1 ring-inset ring-base-700",
        className,
      )}
    >
      <ImageOff className="size-5" />
    </div>
  );
}
