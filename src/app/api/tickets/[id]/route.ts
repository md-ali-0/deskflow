import { requireAuth, toErrorResponse } from "@/lib/auth";
import { statusChangeSchema } from "@/lib/validation/ticket";
import { getTicket, transitionStatus } from "@/services/ticket.service";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    await requireAuth();
    const { id } = await params;
    const ticket = await getTicket(id);
    return Response.json({ ticket });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const body = await request.json().catch(() => null);
    const parsed = statusChangeSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 422 },
      );
    }

    const ticket = await transitionStatus(id, parsed.data.status, user.id);
    return Response.json({ ticket });
  } catch (error) {
    return toErrorResponse(error);
  }
}
