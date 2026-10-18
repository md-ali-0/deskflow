import { requireAuthFromRequest, toErrorResponse } from "@/lib/auth";
import { getDashboardCounts } from "@/services/ticket.service";

export async function GET(request: Request) {
  try {
    await requireAuthFromRequest(request);
    const counts = await getDashboardCounts();
    return Response.json(counts);
  } catch (error) {
    return toErrorResponse(error);
  }
}
