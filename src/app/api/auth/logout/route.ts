import { clearSessionCookie, toErrorResponse } from "@/lib/auth";

export async function POST() {
  try {
    await clearSessionCookie();
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
