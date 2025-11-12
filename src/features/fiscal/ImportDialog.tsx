// src/features/fiscal/ImportDialog.tsx
"use client";

import * as React from "react";
import { CloudUpload, FileJson, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Invoice, FiscalDirection, FiscalKind } from "./types";
import { parseCTeXML, parseNFeXML, parseNFSeXML } from "./parsers";
import { currency } from "./utils";

type Props = {
  directionTab: FiscalDirection;
  empresaCodigoErp: string;
  xmlPreview: Invoice[];
  setXmlPreview: (v: Invoice[]) => void;
  autoGerarTitulos: boolean;
  setAutoGerarTitulos: (v: boolean) => void;
  loading: boolean;
  onConfirm: () => Promise<void>;
};

export function ImportDialog({
  directionTab,
  empresaCodigoErp,
  xmlPreview,
  setXmlPreview,
  autoGerarTitulos,
  setAutoGerarTitulos,
  loading,
  onConfirm,
}: Props) {
  const [parsing, setParsing] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  async function handleFiles(files: FileList, assumedKind?: FiscalKind) {
    setParsing(true);
    try {
      const previews: Invoice[] = [];
      for (const f of Array.from(files)) {
        const txt = await f.text();
        const isNFe = /<NFe[\s>]/.test(txt) || /<procNFe[\s>]/.test(txt);
        const isCTe = /<CTe[\s>]/.test(txt) || /<procCTe[\s>]/.test(txt);
        const isNFSe = /<CompNfse[\s>]/.test(txt) || /<Nfse[\s>]/.test(txt) || /<InfNfse[\s>]/.test(txt);
        const kind: FiscalKind = assumedKind || (isNFe ? "NFE" : isCTe ? "CTE" : isNFSe ? "NFSE" : "NFE");
        const direction: FiscalDirection = directionTab;

        let inv: Invoice;
        if (kind === "NFE") inv = parseNFeXML(txt, direction, empresaCodigoErp);
        else if (kind === "CTE") inv = parseCTeXML(txt, direction, empresaCodigoErp);
        else inv = parseNFSeXML(txt, direction, empresaCodigoErp);

        previews.push(inv);
      }
      setXmlPreview(previews);
    } catch (e) {
      console.error(e);
      alert("Falha ao ler/parsing XML. Verifique os arquivos.");
    } finally {
      setParsing(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm">
          <CloudUpload className="w-4 h-4 mr-2" /> Importar XML
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importar XML de Notas</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                <FileJson className="w-3 h-3 mr-1" /> Arraste e solte ou selecione
              </Badge>
              <Badge variant="outline">Aba atual: {directionTab === "EMITIDA" ? "Emitidas" : "Recebidas"}</Badge>
            </div>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
              }}
              className="border-2 border-dashed rounded-2xl p-6 text-center"
            >
              <p className="text-sm mb-4">Solte aqui vários arquivos .xml</p>
              <Input
                ref={inputRef}
                type="file"
                accept=".xml"
                multiple
                onChange={(e) => e.currentTarget.files && handleFiles(e.currentTarget.files)}
              />
              <div className="text-xs text-muted-foreground mt-2">Detectamos automaticamente NFe, NFSe e CTe</div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch id="auto-titulos" checked={autoGerarTitulos} onCheckedChange={setAutoGerarTitulos} />
                <Label htmlFor="auto-titulos" className="cursor-pointer">
                  Gerar títulos financeiro automaticamente
                </Label>
              </div>
              {parsing && (
                <div className="text-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Lendo arquivos…
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <h3 className="font-medium">Pré-visualização ({xmlPreview.length})</h3>
            </div>
            <div className="max-h-64 overflow-auto border rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-left">
                    <th className="p-2">Tipo</th>
                    <th className="p-2">Número/Série</th>
                    <th className="p-2">Emissão</th>
                    <th className="p-2">Emitente → Dest.</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {xmlPreview.map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">
                        <Badge variant="outline">{r.kind}</Badge>
                      </td>
                      <td className="p-2">
                        {r.numero}/{r.serie}
                      </td>
                      <td className="p-2">{new Date(r.data_emissao).toLocaleDateString()}</td>
                      <td className="p-2">
                        <div className="max-w-[300px] truncate" title={`${r.nome_emitente} → ${r.nome_destinatario}`}>
                          {r.nome_emitente} → {r.nome_destinatario}
                        </div>
                      </td>
                      <td className="p-2 text-right">{currency(r.valor_total)}</td>
                    </tr>
                  ))}
                  {!xmlPreview.length && (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-muted-foreground">
                        Nenhum arquivo carregado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setXmlPreview([])}>
                Limpar
              </Button>
              <Button onClick={onConfirm} disabled={!xmlPreview.length || loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Importar agora
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
