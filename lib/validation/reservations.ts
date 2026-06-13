import { z } from 'zod';

export const reservationRequestSchema = z.object({
  customer_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  customer_email: z.string().email('Please enter a valid email address'),
  customer_phone: z.string()
    .min(9, 'Phone number must be at least 9 characters')
    .max(20, 'Phone number must not exceed 20 characters')
    .regex(/^[\d\s+\-()]+$/, 'Invalid phone number format'),
  reservation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  reservation_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  guests_count: z.preprocess(
    (val) => (val === '' ? 1 : Number(val)),
    z.number().int().min(1, 'At least 1 guest is required').max(20, 'Maximum allowed guests per online booking is 20')
  ),
  occasion: z.string().max(100).optional().nullable(),
  customer_notes: z.string().max(500, 'Notes must not exceed 500 characters').optional().nullable(),
  consent: z.boolean().refine(val => val === true, 'Consent is required to submit a reservation'),
  privacy_policy_version: z.string().min(1, 'Privacy policy version is required'),
  source_language: z.enum(['pl', 'en']),
});
