import Link from "next/link";
import { ThemeSwitcher } from "@/app/admin/account/theme-switcher";

export function SiteFooter() {
  return (
    <footer className="bg-secondary/50 border-t">
      <div className="container py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Event Registration Platform. All rights reserved.
            </p>
            <p className="text-center sm:text-left text-xs text-muted-foreground/80 mt-2">
                We comply with GDPR regulations regarding personal data protection.
            </p>
        </div>
        <ThemeSwitcher />
      </div>
    </footer>
  );
}
