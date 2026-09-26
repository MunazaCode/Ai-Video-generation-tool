export function getPublicApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (url && url.length > 0) {
    return url.replace(/\/$/, "");
  }
  return "http://127.0.0.1:4000";
}
