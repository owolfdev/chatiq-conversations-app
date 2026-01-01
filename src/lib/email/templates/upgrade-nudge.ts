// src/lib/email/templates/upgrade-nudge.ts
// Upgrade nudge email template for free plan users

interface UpgradeNudgeEmailTemplateData {
  userName?: string;
  currentPlan: string;
  upgradeUrl: string;
  features?: string[];
  unsubscribeUrl?: string;
}

export function renderUpgradeNudgeEmail({
  userName,
  currentPlan,
  upgradeUrl,
  features = [
    "Higher message limits",
    "More storage for documents",
    "Priority support",
    "Advanced analytics",
    "Team collaboration features",
  ],
  unsubscribeUrl,
}: UpgradeNudgeEmailTemplateData) {
  const subject = "Unlock more power with ChatIQ Pro";
  const greeting = userName ? `Hi ${userName},` : "Hi there,";

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #0f172a; line-height: 1.6; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Ready to level up? 🚀</h1>
      </div>
      
      <div style="background: #ffffff; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="margin: 0 0 16px; font-size: 16px;">${greeting}</p>
        
        <p style="margin: 0 0 24px; font-size: 16px; color: #475569;">
          You're currently on the <strong>${currentPlan}</strong> plan. As your chatbot grows, you might need more 
          capacity and advanced features. Here's what you can unlock with an upgrade:
        </p>

        <div style="background: #f1f5f9; padding: 20px; border-radius: 6px; margin: 24px 0;">
          <h2 style="margin: 0 0 16px; font-size: 18px; color: #0f172a;">Pro Plan Benefits:</h2>
          <ul style="margin: 0; padding-left: 20px; color: #475569;">
            ${features
              .map(
                (feature) => `<li style="margin-bottom: 8px;">${feature}</li>`
              )
              .join("")}
          </ul>
        </div>

        <p style="text-align: center; margin: 32px 0 24px;">
          <a href="${upgradeUrl}" style="background-color: #059669; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            View Plans & Upgrade
          </a>
        </p>

        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            <strong>💡 No commitment:</strong> You can upgrade or downgrade at any time. All plans include a 
            <strong> 14-day money-back guarantee</strong>.
          </p>
        </div>

        <p style="margin: 24px 0 0; font-size: 14px; color: #64748b; border-top: 1px solid #e5e7eb; padding-top: 24px;">
          Questions about plans? Reply to this email and we'll help you choose the right one for your needs.
        </p>

        <p style="margin: 16px 0 0; font-size: 14px; color: #94a3b8;">
          Best regards,<br>
          The ChatIQ Team
        </p>
        ${
          unsubscribeUrl
            ? `<p style="margin: 24px 0 0; font-size: 12px; color: #94a3b8;">
          Prefer fewer emails? <a href="${unsubscribeUrl}" style="color: #64748b;">Unsubscribe</a>.
        </p>`
            : ""
        }
      </div>
    </div>
  `;

  const text = [
    "Ready to level up? 🚀",
    "",
    `${greeting}`,
    "",
    `You're currently on the ${currentPlan} plan. As your chatbot grows, you might need more capacity and advanced features. Here's what you can unlock with an upgrade:`,
    "",
    "Pro Plan Benefits:",
    ...features.map((f) => `• ${f}`),
    "",
    `View Plans & Upgrade: ${upgradeUrl}`,
    "",
    "💡 No commitment: You can upgrade or downgrade at any time. All plans include a 14-day money-back guarantee.",
    "",
    "Questions about plans? Reply to this email and we'll help you choose the right one for your needs.",
    "",
    "Best regards,",
    "The ChatIQ Team",
    ...(unsubscribeUrl ? ["", `Unsubscribe: ${unsubscribeUrl}`] : []),
  ].join("\n");

  return {
    subject,
    html,
    text,
  };
}
