export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "employee";
  department: string;
  position: string;
  avatarUrl?: string;
}

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  children?: NavItem[];
}
