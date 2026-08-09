"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { EyeIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { Input } from "@/ui/components/ui/input";

export function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        className={cn("pr-9", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
      >
        <HugeiconsIcon
          icon={visible ? ViewOffSlashIcon : EyeIcon}
          strokeWidth={1.8}
          className="size-4"
        />
      </button>
    </div>
  );
}
