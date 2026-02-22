
import { getEventById, getRegistrationFromFirestore } from '@/lib/data';
import { RegistrationForm } from './registration-form';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface EditRegistrationPageProps {
  params: { eventId: string, registrationId: string };
}

export default async function EditRegistrationPage({ params }: EditRegistrationPageProps) {
  const { eventId, registrationId } = params;
  
  const event = await getEventById(eventId);
  if (!event) {
    notFound();
  }

  const registration = await getRegistrationFromFirestore(eventId, registrationId);
  if (!registration) {
    notFound();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Registration</CardTitle>
        <CardDescription>Update the details for registration ID: {registration.id}.</CardDescription>
      </CardHeader>
      <CardContent>
        <RegistrationForm event={event} registration={registration} />
      </CardContent>
    </Card>
  );
}
