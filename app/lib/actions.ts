'use server';

import { z } from 'zod';
import { InvoiceFormNames } from './definitions';
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const InvoiceFormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(['pending', 'paid']),
  date: z.string(),
});

const CreateInvoice = InvoiceFormSchema.omit({ id: true, date: true });

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const parseInvoiceData = (
  formData: FormData
): { customerId: string; amount: number; status: string } => {
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get(InvoiceFormNames.CUSTOMER_ID),
    amount: formData.get(InvoiceFormNames.AMOUNT),
    status: formData.get(InvoiceFormNames.STATUS),
  });

  const amountInCents = amount * 100;

  return { customerId, amount: amountInCents, status };
};

export const createInvoice = async (formData: FormData) => {
  const { customerId, amount, status } = parseInvoiceData(formData);

  const date = new Date().toISOString().split('T')[0];

  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amount}, ${status}, ${date})
    `;
  } catch (err) {
    console.error(err);
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
};

export const updateInvoice = async (id: string, formData: FormData) => {
  const { customerId, amount, status } = parseInvoiceData(formData);

  try {
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amount}, status = ${status}
      WHERE id = ${id}
    `;
  } catch (err) {
    console.error(err);
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
