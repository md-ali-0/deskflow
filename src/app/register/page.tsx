import { RegisterForm } from "@/components/register-form";

export const metadata = { title: "Create account — DeskFlow" };

export default function RegisterPage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <RegisterForm />
    </main>
  );
}
