import { z } from 'zod';

export const orderItemSchema = z.object({
  menu_item_id: z.string().uuid('Invalid menu item identifier'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(50, 'Quantity cannot exceed 50 per item'),
  customer_notes: z.string().max(200, 'Notes must not exceed 200 characters').optional().nullable(),
});

export const orderRequestSchema = z.object({
  customer_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  customer_email: z.string().email('Please enter a valid email address'),
  customer_phone: z.string()
    .min(9, 'Phone number must be at least 9 characters')
    .max(20, 'Phone number must not exceed 20 characters')
    .regex(/^[\d\s+\-()]+$/, 'Invalid phone number format'),
  order_type: z.enum(['delivery', 'takeaway']),
  customer_notes: z.string().max(500, 'Notes must not exceed 500 characters').optional().nullable(),
  payment_method: z.enum([
    'cash_on_delivery',
    'cash_on_pickup',
    'card_on_delivery',
    'card_on_pickup'
  ]),
  // Delivery address details
  delivery_address: z.string().max(200, 'Address must not exceed 200 characters').optional().nullable(),
  delivery_postal_code: z.string()
    .regex(/^\d{2}-\d{3}$/, 'Postal code must be in Polish format (XX-XXX)')
    .optional().nullable()
    .or(z.literal('')),
  delivery_city: z.string().max(100, 'City must not exceed 100 characters').optional().nullable(),
  // Items array
  items: z.array(orderItemSchema).min(1, 'At least 1 item must be added to the basket'),
  consent: z.boolean().refine(val => val === true, 'Consent is required to submit an order'),
  source_language: z.enum(['pl', 'en']),
})
.refine((data) => {
  // Takeaway payment methods validation
  if (data.order_type === 'takeaway') {
    return data.payment_method === 'cash_on_pickup' || data.payment_method === 'card_on_pickup';
  }
  // Delivery payment methods validation
  if (data.order_type === 'delivery') {
    return data.payment_method === 'cash_on_delivery' || data.payment_method === 'card_on_delivery';
  }
  return false;
}, {
  message: 'Payment method must match the selected order type',
  path: ['payment_method']
})
.refine((data) => {
  // If delivery, address fields are strictly required
  if (data.order_type === 'delivery') {
    return !!data.delivery_address && data.delivery_address.trim().length >= 5;
  }
  return true;
}, {
  message: 'Full street address is required for delivery',
  path: ['delivery_address']
})
.refine((data) => {
  if (data.order_type === 'delivery') {
    return !!data.delivery_postal_code && /^\d{2}-\d{3}$/.test(data.delivery_postal_code);
  }
  return true;
}, {
  message: 'Valid postal code is required for delivery (XX-XXX)',
  path: ['delivery_postal_code']
})
.refine((data) => {
  if (data.order_type === 'delivery') {
    return !!data.delivery_city && data.delivery_city.trim().length >= 2;
  }
  return true;
}, {
  message: 'City name is required for delivery',
  path: ['delivery_city']
});
