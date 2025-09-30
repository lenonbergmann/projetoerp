// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function DashboardRootPage() {
  // Tente reaproveitar a empresa já escolhida (cookie)
  const ck = await cookies();
  const empresaId = ck.get("empresaId")?.value;

  if (empresaId) {
    redirect(`/dashboard/${empresaId}`);
  }

  // Sem empresa definida? Manda escolher.
  redirect("/selecionar-empresa");
}

