'use server';

import { revalidatePath } from 'next/cache';
import { deleteRegistration, getEventById, getRegistrations } from '@/lib/data';
import type { Registration } from '@/lib/types';

export async function deleteRegistrationAction(id: string) {
  try {
    await deleteRegistration(id);
    revalidatePath('/admin/registrations');
    return { success: true, message: 'Registration deleted successfully.' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unknown error occurred.',
    };
  }
}

function convertToCSV(data: Registration[], headers: {key: string, label: string}[]) {
    const headerRow = ['Registration Date', ...headers.map(h => h.label)].join('|');
    const rows = data.map(reg => {
        const values = [
            new Date(reg.registrationDate).toLocaleString(),
            ...headers.map(h => {
                let value = reg.formData[h.key];
                if (Array.isArray(value)) {
                    value = value.join('; ');
                }
                return value ?? '';
            })
        ];
        return values.join('|');
    });
    return [headerRow, ...rows].join('\n');
}

export async function exportRegistrationsAction(eventId: string, format: 'excel' | 'plain' = 'plain') {
    if (!eventId) {
        return { success: false, error: 'Event ID is required.' };
    }

    try {
        const event = await getEventById(eventId);
        if (!event) {
            return { success: false, error: 'Event not found.' };
        }
        
        const registrations = await getRegistrations(eventId);
        if (registrations.length === 0) {
            return { success: false, error: 'No registrations to export for this event.' };
        }

        const headers = event.formFields.map(field => ({ key: field.name, label: field.label }));
        let csvData = convertToCSV(registrations, headers);

        if (format === 'excel') {
            csvData = `sep=|\n${csvData}`;
        }

        return { success: true, csvData, eventName: event.name };
    } catch (error) {
        return { success: false, error: 'Failed to export data.' };
    }
}
