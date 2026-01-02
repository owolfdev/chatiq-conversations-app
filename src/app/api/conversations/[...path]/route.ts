import { proxyToMainApp } from "@/lib/main-app-proxy";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const buildPath = async (paramsPromise: RouteContext["params"]) => {
  const params = await paramsPromise;
  const segments = params.path ?? [];
  return `/api/conversations/${segments.join("/")}`;
};

export async function GET(req: Request, context: RouteContext) {
  return proxyToMainApp(req, await buildPath(context.params));
}

export async function POST(req: Request, context: RouteContext) {
  return proxyToMainApp(req, await buildPath(context.params));
}

export async function PUT(req: Request, context: RouteContext) {
  return proxyToMainApp(req, await buildPath(context.params));
}

export async function PATCH(req: Request, context: RouteContext) {
  return proxyToMainApp(req, await buildPath(context.params));
}

export async function DELETE(req: Request, context: RouteContext) {
  return proxyToMainApp(req, await buildPath(context.params));
}
