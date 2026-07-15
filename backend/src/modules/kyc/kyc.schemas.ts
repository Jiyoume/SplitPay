import { z } from "zod";

const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  countryCode: z.string().optional(),
});

export const putKycBodySchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  mobileNumber: z.string().optional(),
  birthDate: z.string().optional(),
  address: addressSchema.optional(),
  idType: z.string().optional(),
  idNumber: z.string().optional(),
});
export type PutKycBody = z.infer<typeof putKycBodySchema>;
