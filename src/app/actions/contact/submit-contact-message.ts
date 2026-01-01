// src/app/actions/contact/submit-contact-message.ts
"use server";

import { createClient } from "@/utils/supabase/server";

interface ContactFormPayload {
  name: string;
  email: string;
  company?: string;
  subject: string;
  message: string;
  inquiryType: string;
}

export async function submitContactMessage(form: ContactFormPayload) {
  const supabase = await createClient();

  const { name, email, subject, message, inquiryType, company } = form;

  // basic backend validation
  if (!name || !email || !subject || !message || !inquiryType) {
    return {
      success: false,
      error: "Missing required fields",
    };
  }

  const { error } = await supabase.from("bot_contact_messages").insert([
    {
      name,
      email,
      company: company || null,
      subject,
      message,
      inquiry_type: inquiryType,
    },
  ]);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return { success: true };
}
