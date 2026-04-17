import type { HTMLAttributes } from "react";
import { useTranslation } from "react-i18next";

interface SplashProps extends HTMLAttributes<HTMLDivElement> {
  emoji?: string;
}

export function Splash({ emoji = "📱", className = "", ...props }: SplashProps) {
  const { t } = useTranslation();

  return (
    <div
      data-testid="splash-screen"
      className={`flex min-h-screen items-center justify-center bg-background font-sans ${className}`}
      {...props}
    >
      <div className="flex flex-col items-center gap-lg">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary">
          <span className="text-4xl" role="img" aria-label="app icon">
            {emoji}
          </span>
        </div>
        <h1 className="text-3xl font-bold text-foreground">{t("splash.title")}</h1>
        <p className="text-muted">{t("splash.loading")}</p>
      </div>
    </div>
  );
}
