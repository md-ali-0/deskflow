import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { setSessionCookie, signSession, toErrorResponse } from "@/lib/auth";
import { registerSchema } from "@/lib/validation/ticket";

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => null);
        const parsed = registerSchema.safeParse(body);

        if (!parsed.success) {
            return Response.json(
                { error: "Invalid input", issues: parsed.error.issues },
                { status: 422 },
            );
        }

        const email = parsed.data.email.trim().toLowerCase();

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return Response.json(
                { error: "An account with that email already exists" },
                { status: 409 },
            );
        }

        const passwordHash = await bcrypt.hash(parsed.data.password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                name: parsed.data.name,
                passwordHash,
                role: "AGENT",
            },
        });

        const token = await signSession({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        });
        await setSessionCookie(token);

        return Response.json(
            {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                },
            },
            { status: 201 },
        );
    } catch (error) {
        return toErrorResponse(error);
    }
}
