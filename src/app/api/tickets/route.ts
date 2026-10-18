import { requireAuth, toErrorResponse } from "@/lib/auth";
import {
  createTicketSchema,
  listTicketsQuerySchema,
} from "@/lib/validation/ticket";
import { createTicket, listTickets } from "@/services/ticket.service";

export async function GET(request: Request) {
  try {
    await requireAuth();

    const url = new URL(request.url);
    const parsed = listTicketsQuerySchema.safeParse(
      Object.fromEntries(url.searchParams),
    );

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid query", issues: parsed.error.issues },
        { status: 422 },
      );
    }

    const tickets = await listTickets(parsed.data);
    return Response.json({ tickets });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();

    const body = await request.json().catch(() => null);
    const parsed = createTicketSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input", issues: parsed.error.issues },
        { status: 422 },
      );
    }

    const ticket = await createTicket(parsed.data, user.id);
    return Response.json({ ticket }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
