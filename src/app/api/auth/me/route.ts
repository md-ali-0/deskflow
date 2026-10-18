import { getSession, toErrorResponse } from "@/lib/auth";

export async function GET() {
    try {
        const user = await getSession();

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
