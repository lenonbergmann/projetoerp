// src/features/fiscal/parsers.ts
"use client";

import { type Invoice, type FiscalDirection, type Retencoes } from "./types";
import { onlyDigits, toNumberOrNull } from "./utils";

function parseXMLtoDoc(xml: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(xml, "application/xml");
}
const text = (doc: Document, sel: string) => doc.querySelector(sel)?.textContent ?? null;
const pick = (doc: Document, xs: string[]) => xs.map((s) => text(doc, s)).find(Boolean) ?? null;

export function parseNFeXML(xml: string, direction: FiscalDirection, empresa_codigo_erp?: string | null): Invoice {
  const doc = parseXMLtoDoc(xml);

  const chave = pick(doc, ["infNFe", "NFe > infNFe"])?.toString() || text(doc, "protNFe > infProt > chNFe");
  const nNF = pick(doc, ["ide > nNF", "NFe > infNFe > ide > nNF"]);
  const serie = pick(doc, ["ide > serie", "NFe > infNFe > ide > serie"]);
  const dhEmi = pick(doc, ["ide > dhEmi", "NFe > infNFe > ide > dhEmi"]) || pick(doc, ["ide > dEmi", "NFe > infNFe > ide > dEmi"]);

  const emitCNPJ = pick(doc, ["emit > CNPJ", "NFe > infNFe > emit > CNPJ"]);
  const emitXNome = pick(doc, ["emit > xNome", "NFe > infNFe > emit > xNome"]);
  const destCNPJ = pick(doc, ["dest > CNPJ", "NFe > infNFe > dest > CNPJ"]);
  const destXNome = pick(doc, ["dest > xNome", "NFe > infNFe > dest > xNome"]);

  const vProd = pick(doc, ["total > ICMSTot > vProd", "NFe > infNFe > total > ICMSTot > vProd"]);
  const vFrete = pick(doc, ["total > ICMSTot > vFrete", "NFe > infNFe > total > ICMSTot > vFrete"]);
  const vSeg = pick(doc, ["total > ICMSTot > vSeg", "NFe > infNFe > total > ICMSTot > vSeg"]);
  const vOutro = pick(doc, ["total > ICMSTot > vOutro", "NFe > infNFe > total > ICMSTot > vOutro"]);
  const vDesc = pick(doc, ["total > ICMSTot > vDesc", "NFe > infNFe > total > ICMSTot > vDesc"]);
  const vNF = pick(doc, ["total > ICMSTot > vNF", "NFe > infNFe > total > ICMSTot > vNF"]);
  const natOp = pick(doc, ["ide > natOp", "NFe > infNFe > ide > natOp"]);
  const cfop = doc.querySelector("NFe infNFe det CFOP")?.textContent ?? null;

  const ret: Retencoes = {
    pis: toNumberOrNull(doc.querySelector("imposto > PIS > PISOutr > vPIS, imposto > PIS > PISAliq > vPIS")?.textContent ?? null),
    cofins: toNumberOrNull(doc.querySelector("imposto > COFINS > COFINSOutr > vCOFINS, imposto > COFINS > COFINSAliq > vCOFINS")?.textContent ?? null),
    icms_st: toNumberOrNull(doc.querySelector("imposto > ICMS > * > vICMSST")?.textContent ?? null),
  };

  return {
    direction,
    kind: "NFE",
    numero: nNF ?? undefined,
    serie: serie ?? undefined,
    chave: chave ?? undefined,
    cfop: cfop ?? undefined,
    natureza_operacao: natOp ?? undefined,
    data_emissao: dhEmi ? new Date(dhEmi).toISOString() : new Date().toISOString(),
    cnpj_emitente: onlyDigits(emitCNPJ),
    nome_emitente: emitXNome ?? undefined,
    cnpj_destinatario: onlyDigits(destCNPJ),
    nome_destinatario: destXNome ?? undefined,
    valor_produtos: toNumberOrNull(vProd),
    valor_frete: toNumberOrNull(vFrete),
    valor_seguro: toNumberOrNull(vSeg),
    valor_outros: toNumberOrNull(vOutro),
    valor_desconto: toNumberOrNull(vDesc),
    valor_total: toNumberOrNull(vNF) ?? 0,
    status: "AUTORIZADA",
    retencoes: ret,
    xml_raw: xml,
    empresa_codigo_erp: empresa_codigo_erp ?? null,
  };
}

export function parseNFSeXML(xml: string, direction: FiscalDirection, empresa_codigo_erp?: string | null): Invoice {
  const doc = parseXMLtoDoc(xml);
  const numero = pick(doc, ["Numero", "InfNfse > Numero", "CompNfse > Nfse > InfNfse > Numero"]);
  const serie = pick(doc, ["Serie", "InfNfse > Serie"]);
  const competencia =
    pick(doc, ["DataEmissao", "InfNfse > DataEmissao"]) || pick(doc, ["InfNfse > Competencia"]);
  const cnpjPrest = pick(doc, [
    "PrestadorServico > IdentificacaoPrestador > Cnpj",
    "InfNfse > PrestadorServico > IdentificacaoPrestador > Cnpj",
  ]);
  const nomePrest = pick(doc, ["PrestadorServico > RazaoSocial", "InfNfse > PrestadorServico > RazaoSocial"]);
  const cnpjTom = pick(doc, [
    "TomadorServico > IdentificacaoTomador > CpfCnpj > Cnpj",
    "InfNfse > TomadorServico > IdentificacaoTomador > CpfCnpj > Cnpj",
  ]);
  const nomeTom = pick(doc, ["TomadorServico > RazaoSocial", "InfNfse > TomadorServico > RazaoSocial"]);

  const vServ = pick(doc, ["Servico > Valores > ValorServicos", "InfNfse > Servico > Valores > ValorServicos"]);
  const vDedu = pick(doc, ["Servico > Valores > ValorDeducoes", "InfNfse > Servico > Valores > ValorDeducoes"]);
  const vIss = pick(doc, ["Servico > Valores > ValorIss", "InfNfse > Servico > Valores > ValorIss"]);
  const vPis = pick(doc, ["Servico > Valores > ValorPis", "InfNfse > Servico > Valores > ValorPis"]);
  const vCofins = pick(doc, ["Servico > Valores > ValorCofins", "InfNfse > Servico > Valores > ValorCofins"]);
  const vCsll = pick(doc, ["Servico > Valores > ValorCsll", "InfNfse > Servico > Valores > ValorCsll"]);
  const vIr = pick(doc, ["Servico > Valores > ValorIr", "InfNfse > Servico > Valores > ValorIr"]);
  const vInss = pick(doc, ["Servico > Valores > ValorInss", "InfNfse > Servico > Valores > ValorInss"]);
  const vTotal = pick(doc, ["ValorCredito", "InfNfse > ValorCredito"]) || vServ;

  return {
    direction,
    kind: "NFSE",
    numero: numero ?? undefined,
    serie: serie ?? undefined,
    data_emissao: competencia ? new Date(competencia).toISOString() : new Date().toISOString(),
    cnpj_emitente: direction === "EMITIDA" ? onlyDigits(cnpjPrest) : onlyDigits(cnpjTom),
    nome_emitente: direction === "EMITIDA" ? (nomePrest ?? undefined) : (nomeTom ?? undefined),
    cnpj_destinatario: direction === "EMITIDA" ? onlyDigits(cnpjTom) : onlyDigits(cnpjPrest),
    nome_destinatario: direction === "EMITIDA" ? (nomeTom ?? undefined) : (nomePrest ?? undefined),
    valor_servicos: toNumberOrNull(vServ),
    valor_total: toNumberOrNull(vTotal) ?? 0,
    status: "AUTORIZADA",
    retencoes: {
      iss: toNumberOrNull(vIss),
      pis: toNumberOrNull(vPis),
      cofins: toNumberOrNull(vCofins),
      csll: toNumberOrNull(vCsll),
      irrf: toNumberOrNull(vIr),
      inss: toNumberOrNull(vInss),
    },
    xml_raw: xml,
    empresa_codigo_erp: empresa_codigo_erp ?? null,
  };
}

export function parseCTeXML(xml: string, direction: FiscalDirection, empresa_codigo_erp?: string | null): Invoice {
  const doc = parseXMLtoDoc(xml);
  const chave = pick(doc, ["infCte", "CTe > infCte"])?.toString() || text(doc, "protCTe > infProt > chCTe");
  const nCT = pick(doc, ["ide > nCT", "CTe > infCte > ide > nCT"]);
  const serie = pick(doc, ["ide > serie", "CTe > infCte > ide > serie"]);
  const dhEmi = pick(doc, ["ide > dhEmi", "CTe > infCte > ide > dhEmi"]) || pick(doc, ["ide > dEmi", "CTe > infCte > ide > dEmi"]);

  const emitCNPJ = pick(doc, ["emit > CNPJ", "CTe > infCte > emit > CNPJ"]);
  const emitXNome = pick(doc, ["emit > xNome", "CTe > infCte > emit > xNome"]);
  const tomCNPJ =
    pick(doc, ["tomador > CNPJ", "CTe > infCte > tomador > CNPJ"]) || pick(doc, ["toma3 > toma > CNPJ"]);
  const tomXNome =
    pick(doc, ["tomador > xNome", "CTe > infCte > tomador > xNome"]) || pick(doc, ["toma3 > toma > xNome"]);
  const vTPrest = pick(doc, ["vPrest > vTPrest", "CTe > infCte > vPrest > vTPrest"]);

  return {
    direction,
    kind: "CTE",
    numero: nCT ?? undefined,
    serie: serie ?? undefined,
    chave: chave ?? undefined,
    data_emissao: dhEmi ? new Date(dhEmi).toISOString() : new Date().toISOString(),
    cnpj_emitente: onlyDigits(emitCNPJ),
    nome_emitente: emitXNome ?? undefined,
    cnpj_destinatario: onlyDigits(tomCNPJ),
    nome_destinatario: tomXNome ?? undefined,
    valor_total: toNumberOrNull(vTPrest) ?? 0,
    status: "AUTORIZADA",
    xml_raw: xml,
    empresa_codigo_erp: empresa_codigo_erp ?? null,
  };
}
