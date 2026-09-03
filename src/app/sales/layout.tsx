import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SalesLayout } from "@/components/sales/SalesLayout";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return <SalesLayout>{children}</SalesLayout>;
}
