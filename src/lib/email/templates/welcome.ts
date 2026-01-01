// src/lib/email/templates/welcome.ts
// Welcome email template for new users

interface WelcomeEmailTemplateData {
  userName?: string;
  dashboardUrl: string;
}

export function renderWelcomeEmail({
  userName,
  dashboardUrl,
}: WelcomeEmailTemplateData) {
  const subject = "Welcome to ChatIQ! 🎉";
  const greeting = userName ? `Hi ${userName},` : "Hi there,";

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #0f172a; line-height: 1.6; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Welcome to ChatIQ!</h1>
      </div>
      
      <div style="background: #ffffff; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="margin: 0 0 16px; font-size: 16px;">${greeting}</p>
        
        <p style="margin: 0 0 24px; font-size: 16px; color: #475569;">
          We're thrilled to have you join ChatIQ! You're now ready to create AI chatbots that can answer questions, 
          provide support, and engage with your users 24/7.
        </p>

        <div style="background: #f1f5f9; padding: 20px; border-radius: 6px; margin: 24px 0;">
          <h2 style="margin: 0 0 12px; font-size: 18px; color: #0f172a;">What's next?</h2>
          <ol style="margin: 0; padding-left: 20px; color: #475569;">
            <li style="margin-bottom: 8px;">Create your first chatbot</li>
            <li style="margin-bottom: 8px;">Add knowledge documents</li>
            <li style="margin-bottom: 8px;">Embed it on your website</li>
          </ol>
        </div>

        <p style="text-align: center; margin: 32px 0 24px;">
          <a href="${dashboardUrl}" style="background-color: #059669; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            Go to Dashboard
          </a>
        </p>

        <p style="margin: 24px 0 0; font-size: 14px; color: #64748b; border-top: 1px solid #e5e7eb; padding-top: 24px;">
          Need help getting started? Check out our 
          <a href="${dashboardUrl}/docs/quick-start" style="color: #059669; text-decoration: none;">Quick Start Guide</a> 
          or reply to this email if you have any questions.
        </p>

        <p style="margin: 16px 0 0; font-size: 14px; color: #94a3b8;">
          Happy building!<br>
          The ChatIQ Team
        </p>
      </div>
    </div>
  `;

  const text = [
    "Welcome to ChatIQ!",
    "",
    `${greeting}`,
    "",
    "We're thrilled to have you join ChatIQ! You're now ready to create AI chatbots that can answer questions, provide support, and engage with your users 24/7.",
    "",
    "What's next?",
    "1. Create your first chatbot",
    "2. Add knowledge documents",
    "3. Embed it on your website",
    "",
    `Go to Dashboard: ${dashboardUrl}`,
    "",
    `Need help getting started? Check out our Quick Start Guide: ${dashboardUrl}/docs/quick-start`,
    "",
    "Happy building!",
    "The ChatIQ Team",
  ].join("\n");

  return {
    subject,
    html,
    text,
  };
}

