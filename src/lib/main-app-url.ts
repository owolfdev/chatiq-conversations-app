const DEFAULT_MAIN_APP_URL = "https://chatiq.io";

export const getMainAppUrl = () => {
  const raw = process.env.NEXT_PUBLIC_MAIN_APP_URL;
  const value = raw && raw.trim() ? raw.trim() : DEFAULT_MAIN_APP_URL;
  return value.endsWith("/") ? value.slice(0, -1) : value;
};
