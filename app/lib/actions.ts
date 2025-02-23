'use server';

export const createInvoice = async (formData: FormData) => {
  const rawFormData: { [key: string]: unknown } = {};

  for (const pair of formData.entries()) {
    rawFormData[pair[0]] = pair[1];
  }

  console.log(rawFormData);
};
