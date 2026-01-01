// src/lib/email/templates/setup-guide.ts
// Setup guide email template sent after first bot creation

interface SetupGuideEmailTemplateData {
  userName?: string;
  botName: string;
  dashboardUrl: string;
  docsUrl: string;
}

export function renderSetupGuideEmail({
  userName,
  botName,
  dashboardUrl,
  docsUrl,
}: SetupGuideEmailTemplateData) {
  const subject = `Great start! Here's how to make ${botName} even better`;
  const greeting = userName ? `Hi ${userName},` : "Hi there,";

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #0f172a; line-height: 1.6; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">You created "${botName}"! 🚀</h1>
      </div>
      
      <div style="background: #ffffff; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="margin: 0 0 16px; font-size: 16px;">${greeting}</p>
        
        <p style="margin: 0 0 24px; font-size: 16px; color: #475569;">
          Congratulations on creating your first chatbot! Now let's make it even more powerful by adding knowledge 
          and customizing it to your needs.
        </p>

        <div style="background: #f1f5f9; padding: 20px; border-radius: 6px; margin: 24px 0;">
          <h2 style="margin: 0 0 16px; font-size: 18px; color: #0f172a;">Next Steps:</h2>
          
          <div style="margin-bottom: 20px;">
            <h3 style="margin: 0 0 8px; font-size: 16px; color: #059669;">1. Add Knowledge Documents</h3>
            <p style="margin: 0; font-size: 14px; color: #475569;">
              Upload documents, FAQs, or knowledge bases so your bot can answer questions accurately.
            </p>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="margin: 0 0 8px; font-size: 16px; color: #059669;">2. Customize Your Bot</h3>
            <p style="margin: 0; font-size: 14px; color: #475569;">
              Fine-tune the system prompt, adjust settings, and make it match your brand.
            </p>
          </div>

          <div style="margin-bottom: 0;">
            <h3 style="margin: 0 0 8px; font-size: 16px; color: #059669;">3. Embed on Your Website</h3>
            <p style="margin: 0; font-size: 14px; color: #475569;">
              Get the embed code and add your chatbot to your website in minutes.
            </p>
          </div>
        </div>

        <p style="text-align: center; margin: 32px 0 24px;">
          <a href="${dashboardUrl}" style="background-color: #059669; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            Continue Setup
          </a>
        </p>

        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            <strong>💡 Pro Tip:</strong> Check out our 
            <a href="${docsUrl}" style="color: #d97706; text-decoration: none; font-weight: 600;">documentation</a> 
            for advanced features like API integration, custom themes, and team collaboration.
          </p>
        </div>

        <p style="margin: 24px 0 0; font-size: 14px; color: #64748b; border-top: 1px solid #e5e7eb; padding-top: 24px;">
          Questions? Just reply to this email - we're here to help!
        </p>

        <p style="margin: 16px 0 0; font-size: 14px; color: #94a3b8;">
          Best regards,<br>
          The ChatIQ Team
        </p>
      </div>
    </div>
  `;

  const text = [
    `You created "${botName}"! 🚀`,
    "",
    `${greeting}`,
    "",
    "Congratulations on creating your first chatbot! Now let's make it even more powerful by adding knowledge and customizing it to your needs.",
    "",
    "Next Steps:",
    "",
    "1. Add Knowledge Documents",
    "   Upload documents, FAQs, or knowledge bases so your bot can answer questions accurately.",
    "",
    "2. Customize Your Bot",
    "   Fine-tune the system prompt, adjust settings, and make it match your brand.",
    "",
    "3. Embed on Your Website",
    "   Get the embed code and add your chatbot to your website in minutes.",
    "",
    `Continue Setup: ${dashboardUrl}`,
    "",
    `💡 Pro Tip: Check out our documentation for advanced features: ${docsUrl}`,
    "",
    "Questions? Just reply to this email - we're here to help!",
    "",
    "Best regards,",
    "The ChatIQ Team",
  ].join("\n");

  return {
    subject,
    html,
    text,
  };
}

