import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="bg-secondary/50 border-t">
      <div className="container py-6">
        <p className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Platforma rejestracji wydarzeń. Wszelkie prawa zastrzeżone.
        </p>
        <p className="text-center text-xs text-muted-foreground/80 mt-2">
            Przestrzegamy regulacji RODO/GDPR dotyczących ochrony danych osobowych.
        </p>
      </div>
    </footer>
  );
}
