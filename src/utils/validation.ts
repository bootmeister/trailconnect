import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export const profileSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(30),
  bio: z.string().max(160, 'Bio must be 160 characters or less').optional(),
  location: z.string().max(100).optional(),
})

export const postSchema = z.object({
  description: z.string().max(500, 'Description must be 500 characters or less'),
  images: z.array(z.string()).max(6, 'Maximum 6 images allowed'),
})

export const eventSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  description: z.string().max(500, 'Description must be 500 characters or less'),
  dateTime: z.date(),
  maxAttendees: z.number().min(2).max(50).optional(),
})
