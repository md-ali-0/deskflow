import { requireAuth, toErrorResponse } from "@/lib/auth";
import { getDashboardCounts } from "@/services/ticket.service";

export async function GET() {
  try {
    await requireAuth();
    const counts = await getDashboardCounts();
    return Response.json(counts);
  } catch (error) {
    return toErrorResponse(error);
  }
}
