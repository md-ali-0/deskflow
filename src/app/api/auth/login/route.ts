import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { setSessionCookie, signSession, toErrorResponse } from "@/lib/auth";
import { loginSchema } from "@/lib/validation/ticket";

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => null);
        const parsed = loginSchema.safeParse(body);

        if (!parsed.success) {
            return Response.json(
                { error: "Invalid input", issues: parsed.error.issues },
                { status: 422 },
            );
        }

        const email = parsed.data.email.trim().toLowerCase();
        const { password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return Response.json(
                { error: "Invalid email or password" },
                { status: 401 },
            );
        }

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) {
            return Response.json(
                { error: "Invalid email or password" },
                { status: 401 },
            );
        }

        const token = await signSession({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        });
        await setSessionCookie(token);

        return Response.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        });
    } catch (error) {
        return toErrorResponse(error);
    }
}
