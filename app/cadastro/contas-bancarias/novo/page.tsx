"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@/lib/supabase/clientComponentClient";

import {
  Building2,
  WalletCards,
  PlugZap,
  FileText,
  Receipt,
  PhoneCall,
  History as HistoryIcon,
  Shuffle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

/* ======================= Tipos ======================= */

type EmpresaBPO = {
  codigo_erp: number;
  nome_fantasia: string | null;
};

type FormState = {
  tipo: string;
  banco: string;
  agencia: string;
  conta: string;
  apelido: string;
  loja: string;
  saldoInicial: string;
  dataSaldoInicial: string;
  considerarFluxo: boolean;
  empresabpo: string;
  status: string; // "Ativo" | "Inativo"
  pix_chave: string;
};

/* ======================= Helpers ======================= */

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(^| )" + name + "=([^;]+)")
  );
  return match ? decodeURIComponent(match[2]) : null;
}

/* ======================= Página ======================= */

export default function NovaContaBancariaPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [empresas, setEmpresas] = useState<EmpresaBPO[]>([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    tipo: "",
    banco: "",
    agencia: "",
    conta: "",
    apelido: "",
    loja: "",
    saldoInicial: "",
    dataSaldoInicial: "",
    considerarFluxo: true,
    empresabpo: "",
    status: "Ativo",
    pix_chave: "",
  });

  /* =================== LOAD EMPRESAS =================== */

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadingEmpresas(true);
      const { data, error } = await supabase
        .from("empresas_bpo")
        .select("codigo_erp, nome_fantasia")
        .order("nome_fantasia", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error(error);
        setErrorMsg(`Falha ao carregar empresas: ${error.message}`);
      } else {
        const list = (data ?? []) as EmpresaBPO[];
        setEmpresas(list);

        // Tenta pré-selecionar a empresa pelo cookie empresaId
        const cookieVal = getCookie("empresaId");
        if (cookieVal) {
          const found = list.find(
            (e) => String(e.codigo_erp) === cookieVal
          );
          if (found) {
            setForm((prev) => ({
              ...prev,
              empresabpo: String(found.codigo_erp),
            }));
          }
        }
      }

      setLoadingEmpresas(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  /* =================== HELPERS FORM =================== */

  function onChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const canSubmit = useMemo(() => {
    return (
      !!form.banco.trim() &&
      !!form.apelido.trim() &&
      !!form.empresabpo.trim() &&
      !saving &&
      !loading
    );
  }, [form, saving, loading]);

  const isAtiva = (form.status ?? "").toLowerCase() === "ativo";

  /* =================== SUBMIT (com geração de Id) =================== */

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    setErrorMsg(null);

    try {
      // 1) Descobrir o próximo Id (MAX("Id") + 1)
      const { data: maxRow, error: maxError } = await supabase
        .from("contas_bancarias")
        .select("Id")
        .order("Id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maxError) {
        console.error(maxError);
        // podemos continuar com nextId = 1 mesmo se der erro aqui,
        // mas é bom avisar/registrar.
      }

      let nextId = 1;
      if (maxRow && maxRow.Id != null) {
        const current = Number(maxRow.Id);
        if (Number.isFinite(current)) {
          nextId = current + 1;
        }
      }

      const row: Record<string, any> = {
        Id: nextId, // <- AQUI enviamos o Id manualmente
        Tipo: form.tipo.trim() || null,
        Banco: form.banco.trim() || null,
        Agencia: form.agencia ? Number(form.agencia) : null,
        Conta: form.conta.trim() || null,
        Apelido: form.apelido.trim() || null,
        Loja: form.loja ? Number(form.loja) : null,
        saldo_inicial: form.saldoInicial.trim() || null,
        data_saldo_inicial: form.dataSaldoInicial || null,
        considerar_fluxo: !!form.considerarFluxo,
        empresabpo: form.empresabpo ? Number(form.empresabpo) : null,
        Status: form.status?.trim() || "Ativo",
        pix_chave: form.pix_chave.trim() || null,
      };

      const { data, error } = await supabase
        .from("contas_bancarias")
        .insert(row)
        .select("Id")
        .single();

      if (error) {
        console.error(error);
        setErrorMsg(`Falha ao criar conta: ${error.message}`);
        setSaving(false);
        return;
      }

      const newId = (data as any)?.Id;

      if (newId) {
        router.replace(`/cadastro/contas-bancarias/${newId}`);
      } else {
        router.replace("/cadastro/contas-bancarias");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message ?? "Erro inesperado ao salvar.");
      setSaving(false);
    }
  }

  /* =================== UI =================== */

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cabeçalho */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                  <WalletCards className="h-3 w-3" />
                  Contas bancárias
                </span>
                <span className="text-muted-foreground">/</span>
                <span className="font-mono text-[11px]">Nova conta</span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Nova conta bancária
              </h1>
              <p className="text-sm text-muted-foreground">
                Cadastre uma nova conta para utilizar em conciliações,
                pagamentos e fluxo de caixa.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge
                  variant={isAtiva ? "default" : "outline"}
                  className="gap-1"
                >
                  <span
                    className={
                      isAtiva
                        ? "h-2 w-2 rounded-full bg-emerald-500"
                        : "h-2 w-2 rounded-full bg-slate-400"
                    }
                  />
                  {isAtiva ? "Ativa" : "Inativa"}
                </Badge>
                {form.empresabpo && (
                  <Badge variant="outline" className="gap-1">
                    <Building2 className="h-3 w-3" />
                    Empresa BPO #{form.empresabpo}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => router.replace("/cadastro/contas-bancarias")}
              >
                Voltar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="rounded-xl"
                disabled={!canSubmit}
              >
                {saving ? "Salvando…" : "Salvar conta"}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Tabs principais – mesmas abas da edição, mas só Dados realmente funcional */}
          <Tabs defaultValue="dados" className="space-y-4">
            <TabsList className="w-full justify-start overflow-x-auto rounded-2xl bg-muted/40 p-1">
              <TabsTrigger value="dados" className="gap-2">
                <WalletCards className="h-4 w-4" />
                Dados
              </TabsTrigger>

              <TabsTrigger value="conciliacao" className="gap-2" disabled>
                <Shuffle className="h-4 w-4" />
                Conciliação
              </TabsTrigger>

              <TabsTrigger value="integracoes" className="gap-2" disabled>
                <PlugZap className="h-4 w-4" />
                Integrações
              </TabsTrigger>

              <TabsTrigger value="pagamentos" className="gap-2" disabled>
                <FileText className="h-4 w-4" />
                Pagamentos & CNAB
              </TabsTrigger>

              <TabsTrigger value="boletos" className="gap-2" disabled>
                <Receipt className="h-4 w-4" />
                Boletos
              </TabsTrigger>

              <TabsTrigger value="contatos" className="gap-2" disabled>
                <PhoneCall className="h-4 w-4" />
                Contatos
              </TabsTrigger>

              <TabsTrigger value="historico" className="gap-2" disabled>
                <HistoryIcon className="h-4 w-4" />
                Histórico
              </TabsTrigger>
            </TabsList>

            {/* TAB: DADOS (funcional) */}
            <TabsContent value="dados" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Dados principais
                  </CardTitle>
                  <CardDescription>
                    Informações básicas da conta bancária e vínculo com a
                    empresa BPO.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Empresa BPO + Tipo + Status */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">
                        Empresa BPO *
                      </Label>
                      {loadingEmpresas ? (
                        <div className="text-xs text-muted-foreground">
                          Carregando empresas…
                        </div>
                      ) : (
                        <select
                          className="h-9 w-full rounded-xl border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          value={form.empresabpo}
                          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                            onChange("empresabpo", e.target.value)
                          }
                          required
                        >
                          <option value="">Selecione a empresa</option>
                          {empresas.map((emp) => (
                            <option
                              key={emp.codigo_erp}
                              value={emp.codigo_erp}
                            >
                              {emp.nome_fantasia ?? emp.codigo_erp}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium">
                        Tipo de conta
                      </Label>
                      <select
                        className="h-9 w-full rounded-xl border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={form.tipo}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                          onChange("tipo", e.target.value)
                        }
                      >
                        <option value="">Selecione</option>
                        <option value="Corrente">Conta corrente</option>
                        <option value="Investimento">Conta investimento</option>
                        <option value="Capital">Conta capital</option>
                        <option value="Operadora">Operadora de cartão</option>
                        <option value="Pagamento">Conta de pagamento</option>
                        <option value="Aplicacao">Aplicação</option>
                        <option value="Adiantamento">Adiantamento</option>
                        <option value="Caixa">Caixa</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Status</Label>
                      <div className="flex h-9 items-center justify-between rounded-xl border bg-background px-3">
                        <span className="text-xs text-muted-foreground">
                          {isAtiva ? "Conta ativa" : "Conta inativa"}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground">
                            {isAtiva ? "Ativo" : "Inativo"}
                          </span>
                          <Switch
                            checked={isAtiva}
                            onCheckedChange={(checked) =>
                              onChange("status", checked ? "Ativo" : "Inativo")
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-2" />

                  {/* Banco + Agência + Conta + Loja */}
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-xs font-medium">
                        Banco *
                      </Label>
                      <Input
                        value={form.banco}
                        onChange={(e) => onChange("banco", e.target.value)}
                        placeholder="Ex.: Itaú, Sicoob…"
                        className="rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Agência</Label>
                      <Input
                        value={form.agencia}
                        onChange={(e) =>
                          onChange(
                            "agencia",
                            e.target.value.replace(/\D/g, "")
                          )
                        }
                        inputMode="numeric"
                        placeholder="0001"
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Conta</Label>
                      <Input
                        value={form.conta}
                        onChange={(e) => onChange("conta", e.target.value)}
                        placeholder="12345-6"
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-xs font-medium">
                        Apelido da conta *
                      </Label>
                      <Input
                        value={form.apelido}
                        onChange={(e) => onChange("apelido", e.target.value)}
                        placeholder="Ex.: Itaú Matriz, Sicoob Loja 1"
                        className="rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">
                        Loja (opcional)
                      </Label>
                      <Input
                        value={form.loja}
                        onChange={(e) =>
                          onChange("loja", e.target.value.replace(/\D/g, ""))
                        }
                        inputMode="numeric"
                        placeholder="Número da loja"
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  <Separator className="my-2" />

                  {/* PIX + saldo inicial */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Chave PIX</Label>
                      <Input
                        value={form.pix_chave}
                        onChange={(e) =>
                          onChange("pix_chave", e.target.value)
                        }
                        placeholder="CPF/CNPJ, e-mail, telefone ou aleatória"
                        className="rounded-xl"
                      />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">
                          Saldo inicial
                        </Label>
                        <Input
                          value={form.saldoInicial}
                          onChange={(e) =>
                            onChange("saldoInicial", e.target.value)
                          }
                          inputMode="decimal"
                          placeholder="Ex.: 1500,00"
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">
                          Data do saldo inicial
                        </Label>
                        <Input
                          type="date"
                          value={form.dataSaldoInicial}
                          onChange={(e) =>
                            onChange("dataSaldoInicial", e.target.value)
                          }
                          className="rounded-xl"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Considerar no fluxo */}
                  <div className="mt-2 flex items-center justify-between rounded-xl border bg-muted/40 px-3 py-2.5">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-medium">
                        Considerar no Fluxo de Caixa
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Quando ativo, essa conta entra nos dashboards e
                        relatórios de fluxo de caixa.
                      </p>
                    </div>
                    <Switch
                      checked={form.considerarFluxo}
                      onCheckedChange={(checked) =>
                        onChange("considerarFluxo", checked)
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Demais abas desabilitadas, só explicando o fluxo */}
            <TabsContent value="conciliacao">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shuffle className="h-4 w-4" />
                    Conciliação
                  </CardTitle>
                  <CardDescription>
                    Para configurar regras de conciliação, primeiro salve a conta.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Após criar a conta, você será redirecionado para a tela de edição, 
                  onde poderá cadastrar regras de conciliação específicas para o extrato
                  dessa conta.
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="integracoes">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <PlugZap className="h-4 w-4" />
                    Integrações
                  </CardTitle>
                  <CardDescription>
                    Integrações com o banco serão habilitadas após a criação da conta.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Depois de salvar, você poderá configurar APIs, webhooks e credenciais
                  específicas por conta bancária.
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pagamentos">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Pagamentos & CNAB
                  </CardTitle>
                  <CardDescription>
                    Configurações de CNAB e automação do contas a pagar.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Esta seção ficará disponível na página de edição, após a criação
                  da conta bancária.
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="boletos">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Boletos
                  </CardTitle>
                  <CardDescription>
                    Ative a emissão de boletos depois que a conta estiver criada.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Na tela de edição você poderá ativar a emissão de boletos e definir
                  carteira, instruções e demais parâmetros.
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contatos">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <PhoneCall className="h-4 w-4" />
                    Contatos
                  </CardTitle>
                  <CardDescription>
                    Gerente da conta, operadora de cartão e mesa de câmbio.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Após criar a conta, você poderá cadastrar os contatos principais 
                  relacionados a esta conta bancária.
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="historico">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <HistoryIcon className="h-4 w-4" />
                    Histórico
                  </CardTitle>
                  <CardDescription>
                    Logs de criação e alterações da conta.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  O histórico passa a existir após a conta ser criada e editada.
                  Mais tarde, a tela de edição vai exibir a linha do tempo de mudanças.
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Mensagens de erro */}
          {errorMsg && (
            <Card className="border-red-300 bg-red-50">
              <CardContent className="p-3 text-sm text-red-700">
                {errorMsg}
              </CardContent>
            </Card>
          )}

          {/* Botões finais */}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => router.replace("/cadastro/contas-bancarias")}
            >
              Voltar sem salvar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="rounded-xl"
              disabled={!canSubmit}
            >
              {saving ? "Salvando…" : "Salvar conta"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
