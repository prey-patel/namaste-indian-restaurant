import { z } from 'zod';

export const categoryFormSchema = z.object({
  name_pl: z.string().min(2, 'Name (PL) must be at least 2 characters').max(100),
  name_en: z.string().min(2, 'Name (EN) must be at least 2 characters').max(100),
  slug: z.string().min(2, 'Slug must be at least 2 characters').max(120),
  display_order: z.preprocess(
    (val) => (val === '' ? 0 : Number(val)),
    z.number().int().min(0, 'Display order must be at least 0')
  ),
  is_active: z.boolean().default(true),
});

export const menuItemFormSchema = z.object({
  category_id: z.string().uuid('Category is required'),
  name_pl: z.string().min(2, 'Name (PL) must be at least 2 characters').max(100),
  name_en: z.string().min(2, 'Name (EN) must be at least 2 characters').max(100),
  description_pl: z.string().max(500, 'Description (PL) must not exceed 500 characters').optional().nullable(),
  description_en: z.string().max(500, 'Description (EN) must not exceed 500 characters').optional().nullable(),
  price: z.preprocess(
    (val) => (val === '' ? 0 : Number(val)),
    z.number().positive('Price must be greater than 0').max(9999.99, 'Price must be less than 10000')
  ),
  display_order: z.preprocess(
    (val) => (val === '' ? 0 : Number(val)),
    z.number().int().min(0, 'Sort order must be at least 0')
  ),
  spiciness: z.preprocess(
    (val) => (val === '' ? 0 : Number(val)),
    z.number().int().min(0).max(3, 'Spiciness must be between 0 and 3')
  ),
  allergens: z.array(z.string()).default([]),
  is_vegetarian: z.boolean().default(false),
  is_vegan: z.boolean().default(false),
  is_gluten_free: z.boolean().default(false),
  is_chef_special: z.boolean().default(false),
  is_popular: z.boolean().default(false),
  is_new: z.boolean().default(false),
  image_url: z.string().optional().nullable(),
});
