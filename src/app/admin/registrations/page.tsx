import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function RegistrationsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrations</CardTitle>
        <CardDescription>View and manage event registrations.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-muted-foreground">
            <p>This feature is under construction.</p>
            <p className="text-sm">You will soon be able to view the list of participants here.</p>
        </div>
      </CardContent>
    </Card>
  );
}
