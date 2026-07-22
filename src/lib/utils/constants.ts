import {
  CalendarDays,
  FolderKanban,
  LayoutDashboard,
  UploadCloud,
  UserRound,
  Users,
} from "lucide-react";
import { UserRole } from "@/types";

export const photographerCookieName = "ep-photographer";
export const adminCookieName = "ep-admin";
export const authCookieName = photographerCookieName;

export const dashboardNavItems = [
  {
    href: "/photographer/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/photographer/events",
    label: "Events",
    icon: CalendarDays,
  },
  {
    href: "/photographer/uploads",
    label: "Uploads",
    icon: UploadCloud,
  },
  {
    href: "/photographer/gallery",
    label: "Gallery",
    icon: FolderKanban,
  },
  {
    href: "/photographer/profile",
    label: "Profile",
    icon: UserRound,
  },
];
