import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function RegistrationsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rejestracje</CardTitle>
        <CardDescription>Przeglądaj i zarządzaj rejestracjami na wydarzenia.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-muted-foreground">
            <p>Ta funkcja jest w budowie.</p>
            <p className="text-sm">Wkrótce będzie można tutaj przeglądać listę uczestników.</p>
        </div>
      </CardContent>
    </Card>
  );
}
