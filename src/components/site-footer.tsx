import Link from "next/link";
import { ThemeSwitcher } from "@/app/admin/account/theme-switcher";

export function SiteFooter() {
  return (
    <footer className="bg-secondary/50 border-t">
      <div className="container py-6 flex flex-col sm:flex-row items-center gap-4">
        {/* This spacer pushes the text to the center on larger screens */}
        <div className="hidden sm:block sm:flex-1"></div>

        <div className="text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Event Registration Platform. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground/80 mt-2">
                We comply with GDPR regulations regarding personal data protection.
            </p>
        </div>

        {/* This container pushes the switcher to the right on larger screens */}
        <div className="sm:flex-1 sm:flex sm:justify-end">
          <ThemeSwitcher />
        </div>
      </div>
    </footer>
  );
}
