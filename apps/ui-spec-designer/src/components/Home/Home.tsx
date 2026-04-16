import type { HTMLAttributes } from "react";
import { useTranslation } from "react-i18next";

type HomeProps = HTMLAttributes<HTMLDivElement>;

export function Home({ className = "", ...props }: HomeProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`flex min-h-full items-center justify-center bg-background font-sans ${className}`}
      {...props}
    >
      <div className="flex flex-col items-center gap-md text-center">
        <h1 className="text-4xl font-bold text-foreground">{t("home.greeting")}</h1>
        <p className="text-lg text-muted">{t("home.subtitle")}</p>
      </div>
    </div>
  );
}
