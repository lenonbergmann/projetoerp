// src/features/fiscal/NotasTable.tsx
"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { currency } from "./utils";
import { type Invoice } from "./types";

export function NotasTable({
  rows,
  selectedIds,
  toggleSelect,
}: {
  rows: Invoice[];
  selectedIds: string[];
  toggleSelect: (id?: string) => void;
}) {
  return (
    <div className="border rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 text-left">
            <th className="p-2 w-10" />
            <th className="p-2">Tipo</th>
            <th className="p-2">Número/Série</th>
            <th className="p-2">Emissão</th>
            <th className="p-2">Emitente</th>
            <th className="p-2">Destinatário</th>
            <th className="p-2">CFOP</th>
            <th className="p-2">Chave</th>
            <th className="p-2 text-right">Total</th>
            <th className="p-2">Retenções</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id ?? `${r.kind}-${r.numero}-${r.serie}-${r.chave}`} className="border-t hover:bg-muted/30">
              <td className="p-2 align-top">
                <Checkbox checked={selectedIds.includes(r.id ?? "")} onCheckedChange={() => toggleSelect(r.id)} />
              </td>
              <td className="p-2 align-top">
                <Badge variant="outline">{r.kind}</Badge>
              </td>
              <td className="p-2 align-top">
                {r.numero}/{r.serie}
              </td>
              <td className="p-2 align-top">{new Date(r.data_emissao).toLocaleDateString()}</td>
              <td className="p-2 align-top">
                <div className="max-w-[220px] truncate" title={`${r.nome_emitente} (${r.cnpj_emitente})`}>
                  {r.nome_emitente}
                </div>
                <div className="text-xs text-muted-foreground">{r.cnpj_emitente}</div>
              </td>
              <td className="p-2 align-top">
                <div className="max-w-[220px] truncate" title={`${r.nome_destinatario} (${r.cnpj_destinatario})`}>
                  {r.nome_destinatario}
                </div>
                <div className="text-xs text-muted-foreground">{r.cnpj_destinatario}</div>
              </td>
              <td className="p-2 align-top">{r.cfop}</td>
              <td className="p-2 align-top">
                <div className="max-w-[280px] truncate" title={r.chave ?? ""}>
                  {r.chave}
                </div>
              </td>
              <td className="p-2 align-top text-right font-medium">{currency(r.valor_total)}</td>
              <td className="p-2 align-top">
                <div className="flex flex-wrap gap-1 text-xs">
                  {r.retencoes?.iss ? <Badge variant="secondary">ISS {currency(r.retencoes.iss)}</Badge> : null}
                  {r.retencoes?.icms_st ? <Badge variant="secondary">ICMS ST {currency(r.retencoes.icms_st)}</Badge> : null}
                  {r.retencoes?.pis ? <Badge variant="secondary">PIS {currency(r.retencoes.pis)}</Badge> : null}
                  {r.retencoes?.cofins ? <Badge variant="secondary">COFINS {currency(r.retencoes.cofins)}</Badge> : null}
                  {r.retencoes?.csll ? <Badge variant="secondary">CSLL {currency(r.retencoes.csll)}</Badge> : null}
                  {r.retencoes?.irrf ? <Badge variant="secondary">IRRF {currency(r.retencoes.irrf)}</Badge> : null}
                  {r.retencoes?.inss ? <Badge variant="secondary">INSS {currency(r.retencoes.inss)}</Badge> : null}
                  {!r.retencoes || Object.values(r.retencoes).every((v) => !v) ? (
                    <span className="text-muted-foreground">—</span>
                  ) : null}
                </div>
              </td>
              <td className="p-2 align-top">
                <Badge
                  className="uppercase"
                  variant={
                    r.status === "AUTORIZADA"
                      ? "default"
                      : r.status === "CANCELADA" || r.status === "DENEGADA"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {r.status}
                </Badge>
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={11} className="p-8 text-center text-muted-foreground">
                Nenhuma nota encontrada para os filtros informados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
