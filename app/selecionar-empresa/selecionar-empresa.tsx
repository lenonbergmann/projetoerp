// app/selecionar-empresa/selecionar-empresa.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { routes, type AppRoutes } from "@/lib/routes";

type Company = { codigo_erp: string | number; nome_fantasia: string };
type Props = { companies: Company[]; initialSelectedCompanyId?: string };

export function CompanySelector({ companies, initialSelectedCompanyId }: Props) {
  const router = useRouter();
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialSelectedCompanyId ?? "");
  const [loading, setLoading] = useState(false);

  const selectedCompany = useMemo(
    () => companies.find((c) => String(c.codigo_erp) === String(selectedCompanyId)),
    [companies, selectedCompanyId]
  );

  function goTo(path: AppRoutes) {
    router.push(path);
  }

  // PATCH: grava cookie no backend com timeout e navega mesmo em caso de erro
  const handleEnter = async () => {
    if (!selectedCompanyId || loading) return;
    setLoading(true);

    // timeout simples (2s) para não travar a UI
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 2000)
    );

    try {
      await Promise.race([
        fetch("/api/empresa/select", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ empresaId: String(selectedCompanyId) }),
        }),
        timeout,
      ]);
    } catch (e) {
      console.warn("Falha/timeout ao salvar cookie empresaId, prosseguindo assim mesmo:", e);
    } finally {
      setLoading(false);
    }

    // navega de qualquer forma
    goTo(routes.dashboard(selectedCompanyId));
  };

  useEffect(() => {
    if (selectedCompanyId) localStorage.setItem("selectedCompany", String(selectedCompanyId));
  }, [selectedCompanyId]);

  useEffect(() => {
    const saved = localStorage.getItem("selectedCompany");
    if (saved && companies.some((c) => String(c.codigo_erp) === saved)) {
      setSelectedCompanyId(saved);
    } else if (initialSelectedCompanyId) {
      setSelectedCompanyId(initialSelectedCompanyId);
    }
  }, [companies, initialSelectedCompanyId]);

  return (
    <div className="mt-2 w-full max-w-md mx-auto text-left">
      <label htmlFor="company-select" className="block text-sm font-medium text-gray-700 mb-1">
        Empresa (Código ERP)
      </label>

      <select
        id="company-select"
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300
                   focus:outline-none focus:ring-indigo-500 focus:border-indigo-500
                   sm:text-sm rounded-md shadow-sm"
        value={selectedCompanyId}
        onChange={(e) => setSelectedCompanyId(e.target.value)}
      >
        <option value="">-- Selecione --</option>
        {companies.map((company) => (
          <option key={String(company.codigo_erp)} value={String(company.codigo_erp)}>
            {String(company.codigo_erp)}
          </option>
        ))}
      </select>

      {selectedCompany && (
        <p className="mt-4 text-lg text-gray-800">
          <span className="font-semibold">Nome Fantasia: </span>
          {selectedCompany.nome_fantasia}
        </p>
      )}

      <div className="mt-6">
        <button
          type="button"
          onClick={handleEnter}
          disabled={!selectedCompanyId || loading}
          className={`w-full py-2 px-4 rounded-md font-semibold shadow-md
            ${
              selectedCompanyId && !loading
                ? "bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </div>
    </div>
  );
}
