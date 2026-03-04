import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AuthenticatedLayoutClient } from "./layout-client";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <AuthenticatedLayoutClient
      userName={session.name}
      userEmail={session.email}
    >
      {children}
    </AuthenticatedLayoutClient>
  );
}
