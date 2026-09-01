export const ABAR_PRODUCT = {
  name: "ABAR CRM",
  arabicName: "عابر CRM",
  organizationModel: "single-organization" as const,
  locales: ["ar", "en"] as const,
  defaultLocale: "ar" as const,
};

export const ABAR_CHANNELS = ["whatsapp", "messenger", "instagram"] as const;

export type AbarChannel = (typeof ABAR_CHANNELS)[number];
