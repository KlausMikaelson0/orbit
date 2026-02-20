"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ORBIT_LOCALES,
  ORBIT_LOCALE_NAMES,
} from "@/src/lib/orbit-i18n";
import { useOrbitLocale } from "@/src/hooks/use-orbit-locale";

interface OrbitLanguagePickerProps {
  className?: string;
  compact?: boolean;
  showLabel?: boolean;
}

export function OrbitLanguagePicker({
  className,
  compact = false,
  showLabel = true,
}: OrbitLanguagePickerProps) {
  const { locale, setLocale, t } = useOrbitLocale();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showLabel ? (
        <span className="text-xs uppercase tracking-[0.14em] text-zinc-400">
          {t("language.label")}
        </span>
      ) : null}
      <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/20 p-1">
        {ORBIT_LOCALES.map((item) => (
          <Button
            className={cn(
              "rounded-full",
              compact ? "h-7 px-2.5 text-[11px]" : "h-8 px-3 text-xs",
            )}
            key={item}
            onClick={() => setLocale(item)}
            size="sm"
            type="button"
            variant={locale === item ? "default" : "ghost"}
          >
            {ORBIT_LOCALE_NAMES[item]}
          </Button>
        ))}
      </div>
    </div>
  );
}
