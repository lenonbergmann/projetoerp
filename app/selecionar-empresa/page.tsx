// app/selecionar-empresa/page.tsx
import { createServerComponentClient } from "@/lib/supabase/serverClient";
import { redirect } from "next/navigation";
import { CompanySelector } from "./selecionar-empresa";

type Company = { codigo_erp: string | number; nome_fantasia: string };

export default async function SelecionarEmpresaPage() {
  const supabase = createServerComponentClient();

  // 1) Garante usuário autenticado
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) redirect("/login");

  const userId = userData.user.id;

  // 2) Perfil na tabela `usuarios` (vinculado por id uuid)
  const { data: perfil } = await supabase
    .from("usuarios")
    .select("nome")
    .eq("id", userId)
    .maybeSingle();

  const displayName = perfil?.nome ?? "Usuário";

  // 3) Empresas — com tipagem correta
  const { data: companiesData } = await supabase
    .from("empresas_bpo")
    .select("codigo_erp, nome_fantasia")
    .order("codigo_erp", { ascending: true })
    .returns<Company[]>(); // <- TIPAGEM DO 'data'

  const companies: Company[] = companiesData ?? [];
  const initialSelectedCompanyId = companies.length ? String(companies[0].codigo_erp) : "";

  if (!companies.length) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <p className="text-red-500">Nenhuma empresa encontrada.</p>
      </div>
    );
  }

  // 4) Render (com a MESMA LOGO do login)
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl border border-gray-200 text-center w-full max-w-lg">
        {/* LOGO igual à do login */}
        <img
          src="https://files.manuscdn.com/user_upload_by_module/session_file/310419663030929233/ycNQdXNbXTCnDwvQ.png"
          alt="Projeto BPO Logo"
          className="mx-auto h-24 w-auto mb-6"
        />

        <h1 className="text-3xl font-bold text-indigo-600 mb-2">
          Bem-vindo, {displayName}!
        </h1>
        <p className="text-base text-gray-700 mb-6">Selecione a empresa:</p>

        <CompanySelector
          companies={companies}
          initialSelectedCompanyId={initialSelectedCompanyId}
        />

        <form action="/auth/signout" method="post" className="mt-8">
          <button
            type="submit"
            className="py-2 px-4 bg-red-600 text-white font-semibold rounded-md shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
