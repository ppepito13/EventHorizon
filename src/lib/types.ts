/**
 * @fileOverview Core TypeScript Type Definitions.
 * 
 * DESIGN PRINCIPLE: These types are the "Source of Truth" for both 
 * Firestore documents and frontend component props. 
 * 
 * For the production team: If you migrate to a NoSQL or SQL hybrid, 
 * pay special attention to the 'formData' field in Registration, 
 * which follows a flexible Entity-Attribute-Value (EAV) structure.
 */

/**
 * Metadata definition for a dynamic registration field.
 */
export type FormField = {
  name: string; // The programmatic ID (key in formData)
  label: string; // Human-readable label
  type: 'text' | 'email' | 'tel' | 'checkbox' | 'textarea' | 'radio' | 'multiple-choice' | 'dropdown';
  placeholder?: string;
  required: boolean;
  options?: string[]; // Used for choice-based fields
};

/**
 * Top-level Event entity.
 * 
 * TODO: For production, move 'formFields' to a strongly-typed JSON schema 
 * or a separate collection to avoid document size limits if an event 
 * has hundreds of complex fields.
 */
export type Event = {
  id: string;
  name: string;
  slug: string; // URL identifier (unique index)
  date: string; // Composite display string
  location: {
    types: Array<'Virtual' | 'On-site'>;
    address?: string; // Required if types includes 'On-site'
  };
  description: string; // Slate.js JSON string
  heroImage: {
    src: string;
    hint: string; // Used for AI image searching/generation
  };
  formFields: FormField[];
  rodo: string; // GDPR text
  rodoLabel?: string; // Consent checkbox label
  terms: {
    enabled: boolean;
    url: string;
    text: string;
  };
  isActive: boolean; // Public visibility toggle
  requiresApproval: boolean; // Enrollment workflow toggle
  themeColor: string; // Dynamic brand primary color (HEX)
  ownerId?: string; // Firebase UID of the primary organizer
  members?: { [key: string]: string }; // Map of UID -> Role for collaborative management
};

export type User = {
  id: string; // Internal ID (usr_...)
  name: string;
  email: string; // Primary identity link to Firebase Auth
  role: 'Administrator' | 'Organizer';
  assignedEvents: string[]; // List of event names (MVP) or IDs (Prod) user can manage
  uid?: string; // The actual Firebase Auth UID (once linked)
};

/**
 * Attendee Registration Record.
 */
export type Registration = {
  id: string;
  qrId?: string; // Link to the public /qrcodes collection entry
  eventId: string;
  eventName: string;
  registrationDate: string; // ISO 8601 timestamp
  /**
   * Flexible object containing values for the event's formFields.
   * Keys correspond to FormField.name.
   */
  formData: { [key: string]: any };
  checkedIn?: boolean;
  checkInTime?: string | null;
  isApproved: boolean; // True by default unless event.requiresApproval is true
};
