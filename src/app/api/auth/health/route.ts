import { proxyToMainApp } from "@/lib/main-app-proxy";

export async function GET(req: Request) {
  return proxyToMainApp(req, "/api/auth/health");
}
