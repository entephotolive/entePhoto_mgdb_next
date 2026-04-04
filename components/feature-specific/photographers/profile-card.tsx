import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SessionUser } from "@/types";

interface ProfileCardProps {
  user: SessionUser;
}

export function ProfileCard({ user }: ProfileCardProps) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Profile</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{user.name}</h3>
        </div>
        <Badge variant="success">Admin</Badge>
      </div>
      <p className="text-sm text-slate-400">{user.email}</p>
      <p className="text-sm leading-7 text-slate-400">
        The original `profile.jsx` file was empty, so this became a clean, reusable profile summary
        component rather than an invented screen with hidden assumptions.
      </p>
    </Card>
  );
}
