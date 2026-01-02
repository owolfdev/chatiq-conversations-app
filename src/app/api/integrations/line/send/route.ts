import { proxyToMainApp } from "@/lib/main-app-proxy";

export async function POST(req: Request) {
  return proxyToMainApp(req, "/api/integrations/line/send");
}
