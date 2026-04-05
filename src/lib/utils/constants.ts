import { CalendarDays, FolderKanban, LayoutDashboard, UploadCloud, UserRound, Users } from "lucide-react";
import { UserRole } from "@/types";

export const authCookieName = "photo_ceremony_session";

export const dashboardNavItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/events",
    label: "Events",
    icon: CalendarDays,
  },
  {
    href: "/uploads",
    label: "Uploads",
    icon: UploadCloud,
  },
  {
    href: "/gallery",
    label: "Gallery",
    icon: FolderKanban,
  },
  {
    href: "/profile",
    label: "Profile",
    icon: UserRound,
  },
  {
    href: "/photographers",
    label: "Photographers",
    icon: Users,
  },
];
