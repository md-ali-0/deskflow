import { getSessionFromRequest, toErrorResponse } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    return Response.json({ user });
  } catch (error) {
    return toErrorResponse(error);
  }
}
