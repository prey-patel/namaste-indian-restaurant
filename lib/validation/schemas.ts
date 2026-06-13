import { z } from 'zod';

/**
 * Base Zod validation schemas for forms.
 * Used for server-side Zod checking and client-side form controls.
 */

export const contactInquirySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  subject: z.string().min(3, 'Subject must be at least 3 characters').max(150),
  message: z.string().min(10, 'Message must be at least 10 characters').max(1000),
  consent: z.boolean().refine(val => val === true, {
    message: 'Consent to privacy policy is required',
  }),
});

export const reservationRequestSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(9, 'Phone number must be at least 9 digits'),
  guests: z.number().int().min(1, 'At least 1 guest required').max(30),
  date: z.string(), // ISO date string
  time: z.string(), // HH:MM time format
  customerNotes: z.string().max(500).optional(),
  consent: z.boolean().refine(val => val === true, {
    message: 'Consent to terms and privacy policy is required',
  }),
});
