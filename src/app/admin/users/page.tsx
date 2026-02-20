import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function UsersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Użytkownicy</CardTitle>
        <CardDescription>Zarządzaj użytkownikami i ich uprawnieniami.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-muted-foreground">
            <p>Ta funkcja jest w budowie.</p>
            <p className="text-sm">Wkrótce będzie można tutaj zarządzać rolami i dostępem organizatorów.</p>
        </div>
      </CardContent>
    </Card>
  );
}
