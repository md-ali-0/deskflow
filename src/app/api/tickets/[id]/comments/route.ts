import { requireAuth, toErrorResponse } from "@/lib/auth";
import { commentSchema } from "@/lib/validation/ticket";
import { addComment } from "@/services/ticket.service";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const body = await request.json().catch(() => null);
    const parsed = commentSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 422 },
      );
    }

    const comment = await addComment(
      id,
      user.id,
      parsed.data.body,
      parsed.data.isInternal,
    );

    return Response.json({ comment }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
