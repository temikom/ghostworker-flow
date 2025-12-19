import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "full" | "icon";
}

export function Logo({ className, size = "md", variant = "full" }: LogoProps) {
  const sizes = {
    sm: { icon: "w-6 h-6", text: "text-lg" },
    md: { icon: "w-8 h-8", text: "text-xl" },
    lg: { icon: "w-10 h-10", text: "text-2xl" },
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Ghost Icon */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-lg bg-ghost text-ghost-foreground",
          sizes[size].icon
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-5 h-5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 10h.01" />
          <path d="M15 10h.01" />
          <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" />
        </svg>
        {/* Subtle glow effect */}
        <div className="absolute inset-0 rounded-lg bg-ghost opacity-20 blur-sm" />
      </div>

      {/* Text */}
      {variant === "full" && (
        <span className={cn("font-semibold tracking-tight text-foreground", sizes[size].text)}>
          GhostWorker
        </span>
      )}
    </div>
  );
}
