'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { changePasswordAction } from './actions';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

interface ChangePasswordFormProps {
  userId: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Change Password
    </Button>
  );
}

export function ChangePasswordForm({ userId }: ChangePasswordFormProps) {
  const { toast } = useToast();
  const [state, formAction] = useActionState(changePasswordAction.bind(null, userId), undefined);

  useEffect(() => {
    if (state?.success) {
      toast({
        title: 'Success!',
        description: 'Your password has been changed.',
      });
      // Optionally reset form here
    }
  }, [state, toast]);

  return (
    <form action={formAction} className="space-y-4 max-w-lg">
      {state?.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
       {state?.success && (
        <Alert variant="default" className='border-green-500 text-green-700'>
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Password updated successfully.</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current Password</Label>
        <Input name="currentPassword" id="currentPassword" type="password" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <Input name="newPassword" id="newPassword" type="password" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <Input name="confirmPassword" id="confirmPassword" type="password" required />
      </div>
      <SubmitButton />
    </form>
  );
}
