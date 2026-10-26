import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { accountingMethodLabel } from "@/lib/company-settings";
import { getCompany } from "@/lib/company";
import { CompanyMenu } from "./company-menu";

export async function generateMetadata({
  params,
}: LayoutProps<"/foretag/[id]">): Promise<Metadata> {
  const { id } = await params;
  const company = await getCompany(id);
  const name = company?.name ?? "Företag";
  return {
    title: {
      default: `${name} — Omnio`,
      template: `%s — ${name} — Omnio`,
    },
  };
}

export default async function ForetagLayout({
  children,
  params,
}: LayoutProps<"/foretag/[id]">) {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");

  const { id } = await params;
  const company = await getCompany(id);
  if (!company) notFound();

  return (
    <div className="flex flex-1 flex-col bg-neutral-50">
      <CompanyMenu
        companyId={company.id}
        companyName={company.name}
        accountingMethod={accountingMethodLabel(company.accountingMethod)}
      />
      {children}
    </div>
  );
}
