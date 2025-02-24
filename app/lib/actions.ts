'use server';

import { z } from 'zod';
import { InvoiceFormNames, InvoiceState } from './definitions';
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const InvoiceFormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

const CreateInvoice = InvoiceFormSchema.omit({ id: true, date: true });

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const validateInvoiceData = (formData: FormData) => {
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get(InvoiceFormNames.CUSTOMER_ID),
    amount: formData.get(InvoiceFormNames.AMOUNT),
    status: formData.get(InvoiceFormNames.STATUS),
  });

  return validatedFields;
};

export const createInvoice = async (
  prevState: InvoiceState,
  formData: FormData
) => {
  const validatedFields = validateInvoiceData(formData);

  const date = new Date().toISOString().split('T')[0];

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to create invoice.',
    };
  }

  const amountInCents = validatedFields.data.amount * 100;

  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${validatedFields.data.customerId}, ${amountInCents}, ${validatedFields.data.status}, ${date})
    `;
  } catch (err) {
    return {
      message: 'Database Error: Failed to create invoice.',
    };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
};

export const updateInvoice = async (
  id: string,
  prevState: InvoiceState,
  formData: FormData
) => {
  const validatedFields = validateInvoiceData(formData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to update invoice.',
    };
  }

  const amountInCents = validatedFields.data.amount * 100;

  try {
    await sql`
      UPDATE invoices
      SET customer_id = ${validatedFields.data.customerId}, amount = ${amountInCents}, status = ${validatedFields.data.status}
      WHERE id = ${id}
    `;
  } catch (err) {
    return {
      message: 'Database Error: Failed to update invoice.',
    };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
};

export const deleteInvoice = async (id: string) => {
  try {
    await sql`DELETE from invoices WHERE id = ${id}`;
  } catch (err) {
    console.error(err);
  }

  revalidatePath('/dashboard/invoices');
};
