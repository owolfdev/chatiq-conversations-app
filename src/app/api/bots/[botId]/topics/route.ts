import { proxyToMainApp } from "@/lib/main-app-proxy";

type RouteContext = {
  params: Promise<{ botId: string }>;
};

const buildPath = async (paramsPromise: RouteContext["params"]) => {
  const params = await paramsPromise;
  return `/api/bots/${params.botId}/topics`;
};

export async function GET(req: Request, context: RouteContext) {
  return proxyToMainApp(req, await buildPath(context.params));
}
