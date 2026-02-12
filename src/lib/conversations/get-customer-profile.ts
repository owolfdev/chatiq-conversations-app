import type { ConversationListItem } from "@/types/conversations";

export type CustomerProfile = {
  name: string;
  avatarUrl: string | null;
};

const getTrimmedString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const getCustomerProfile = (
  sourceDetail: ConversationListItem["source_detail"]
): CustomerProfile | null => {
  if (!sourceDetail || typeof sourceDetail !== "object") {
    return null;
  }

  const detail = sourceDetail as Record<string, unknown>;
  const lineDisplayName = getTrimmedString(detail.line_display_name);
  const instagramUsername = getTrimmedString(detail.instagram_username);
  const instagramUserId = getTrimmedString(detail.instagram_user_id);
  const twilioProfileName = getTrimmedString(detail.twilio_profile_name);
  const whatsappProfileName = getTrimmedString(detail.whatsapp_profile_name);
  const facebookDisplayName = getTrimmedString(detail.facebook_display_name);
  const facebookProfileName = getTrimmedString(detail.facebook_profile_name);
  const customerName = getTrimmedString(detail.customer_name);

  const name =
    lineDisplayName ||
    (instagramUsername
      ? instagramUsername.startsWith("@")
        ? instagramUsername
        : `@${instagramUsername}`
      : null) ||
    (instagramUserId ? `IG ${instagramUserId}` : null) ||
    twilioProfileName ||
    whatsappProfileName ||
    facebookDisplayName ||
    facebookProfileName ||
    customerName;

  const avatarUrl =
    getTrimmedString(detail.line_picture_url) ||
    getTrimmedString(detail.instagram_profile_picture_url);

  if (!name && !avatarUrl) {
    return null;
  }

  return {
    name: name || "—",
    avatarUrl: avatarUrl || null,
  };
};
