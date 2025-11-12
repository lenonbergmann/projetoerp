// src/features/fiscal/types.ts
export type FiscalDirection = "EMITIDA" | "RECEBIDA";
export type FiscalKind = "NFE" | "NFSE" | "CTE";
export type FiscalStatus = "AUTORIZADA" | "CANCELADA" | "DENEGADA" | "EM_PROCESSAMENTO" | "OUTRO";

export type Retencoes = {
  pis?: number | null;
  cofins?: number | null;
  csll?: number | null;
  irrf?: number | null;
  inss?: number | null;
  iss?: number | null;
  icms_st?: number | null;
};

export type Invoice = {
  id?: string;
  direction: FiscalDirection;
  kind: FiscalKind;
  numero?: string | null;
  serie?: string | null;
  chave?: string | null;
  cfop?: string | null;
  natureza_operacao?: string | null;
  data_emissao: string; // ISO
  data_entrada?: string | null; // ISO
  cnpj_emitente?: string | null;
  nome_emitente?: string | null;
  cnpj_destinatario?: string | null;
  nome_destinatario?: string | null;
  valor_produtos?: number | null;
  valor_servicos?: number | null;
  valor_frete?: number | null;
  valor_seguro?: number | null;
  valor_outros?: number | null;
  valor_desconto?: number | null;
  valor_total: number;
  status: FiscalStatus;
  retencoes?: Retencoes;
  xml_raw?: string | null;
  empresa_codigo_erp?: string | null;
};
