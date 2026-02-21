import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="bg-secondary/50 border-t">
      <div className="container py-6">
        <p className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Event Registration Platform. All rights reserved.
        </p>
        <p className="text-center text-xs text-muted-foreground/80 mt-2">
            We comply with GDPR regulations regarding personal data protection.
        </p>
      </div>
    </footer>
  );
}
