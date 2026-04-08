import { CalendarDays, FolderKanban, LayoutDashboard, UploadCloud, UserRound, Users } from "lucide-react";
import { UserRole } from "@/types";

export const authCookieName = "photo_ceremony_session";

export const dashboardNavItems = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/events",
    label: "Events",
    icon: CalendarDays,
  },
  {
    href: "/admin/uploads",
    label: "Uploads",
    icon: UploadCloud,
  },
  {
    href: "/admin/gallery",
    label: "Gallery",
    icon: FolderKanban,
  },
  {
    href: "/admin/profile",
    label: "Profile",
    icon: UserRound,
  },
  {
    href: "/admin/photographers",
    label: "Photographers",
    icon: Users,
  },
];
