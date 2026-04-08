import { BrandMark } from "@/components/shared/brand-mark";
import { LoginForm } from "@/components/feature-specific/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center gap-8">
      <BrandMark />
      <LoginForm />
    </div>
  );
}
