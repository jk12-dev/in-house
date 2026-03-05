"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Settings,
  Star,
  FileText,
  UserCog,
  Building2,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const mainMenu = [
  {
    title: "대시보드",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
];

const evaluationMenu = [
  {
    title: "다면평가 (360°)",
    href: "/review-360",
    icon: Users,
  },
  {
    title: "인사평가",
    href: "/performance",
    icon: ClipboardCheck,
  },
  {
    title: "평가 결과",
    href: "/results",
    icon: Star,
  },
  {
    title: "평가 양식",
    href: "/templates",
    icon: FileText,
  },
];

const adminMenu = [
  {
    title: "직원 관리",
    href: "/admin/employees",
    icon: UserCog,
  },
  {
    title: "부서 관리",
    href: "/admin/departments",
    icon: Building2,
  },
  {
    title: "시스템 설정",
    href: "/admin/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="text-lg tracking-tight text-white" style={{ fontFamily: "var(--font-heading)" }}>
            likethix Garden
          </span>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenu.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>평가 관리</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {evaluationMenu.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
                  >
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>관리자</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenu.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
                  >
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-5 py-4">
        <p className="text-xs text-white/40">likethix Garden v0.1.0</p>
      </SidebarFooter>
    </Sidebar>
  );
}
