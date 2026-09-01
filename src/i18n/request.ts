import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
  const locale = process.env.NEXT_PUBLIC_APP_LOCALE || "ar";

  let messages;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch {
    messages = (await import(`../../messages/ar.json`)).default;
  }

  return {
    locale,
    messages,
  };
});
