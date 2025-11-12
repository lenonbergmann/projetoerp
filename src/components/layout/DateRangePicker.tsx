"use client";

import * as React from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ============================ Helpers / tipos ============================ */

export type DateRangeValue = { start: Date; end: Date };

const fmtDate = (isoOrDate: string | Date) => {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfMonth = (date = new Date()) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth   = (date = new Date()) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

/* ============================ Grade mensal ============================ */

type MonthGridProps = {
  year: number;
  month: number; // 0-11
  valueStart: Date;
  valueEnd: Date;
  onPick: (d: Date) => void;
};

function MonthGrid({ year, month, valueStart, valueEnd, onPick }: MonthGridProps) {
  const first = new Date(year, month, 1);
  const startWeekDay = (first.getDay() + 6) % 7; // seg=0
  const total = daysInMonth(year, month);

  const leading: (Date | null)[] = Array(startWeekDay).fill(null);
  const monthDays: (Date | null)[] = Array.from({ length: total }).map((_, i) => new Date(year, month, i + 1));
  const cells: (Date | null)[] = leading.concat(monthDays);

  const s = new Date(valueStart.toDateString());
  const e = new Date(valueEnd.toDateString());
  function inRange(d: Date) {
    const dd = new Date(d.toDateString());
    return dd >= s && dd <= e;
  }

  return (
    <div className="text-xs">
      <div className="mb-1 text-center font-medium">
        {first.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) =>
          d ? (
            <button
              key={i}
              type="button"
              onClick={() => onPick(d)}
              className={cn(
                "h-7 rounded-sm text-[12px]",
                inRange(d) ? "bg-primary/10 font-medium" : "hover:bg-accent"
              )}
            >
              {d.getDate()}
            </button>
          ) : (
            <div key={i} />
          )
        )}
      </div>
    </div>
  );
}

/* ============================ Calendário duplo ============================ */

type CalendarDoubleProps = {
  start: Date;
  end: Date;
  onChange: (start: Date, end: Date) => void;
};

function CalendarDouble({ start, end, onChange }: CalendarDoubleProps) {
  const [view, setView] = React.useState<Date>(new Date(start.getFullYear(), start.getMonth(), 1));

  function pick(d: Date) {
    const a = new Date(start.toDateString());
    const b = new Date(end.toDateString());
    const click = new Date(d.toDateString());

    if (click < a || click > b) {
      onChange(click, click);
      return;
    }
    const distStart = Math.abs(+click - +a);
    const distEnd = Math.abs(+click - +b);
    if (distStart < distEnd) onChange(click, b);
    else onChange(a, click);
  }

  const monthsLabels = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
  ];

  return (
    <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
      {/* mês esq */}
      <div className="rounded-md border p-2">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            className="h-7 w-7 rounded-md hover:bg-accent"
            onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-sm font-medium">
            {view.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </div>
          <div className="opacity-0 h-7 w-7" />
        </div>
        <MonthGrid year={view.getFullYear()} month={view.getMonth()} valueStart={start} valueEnd={end} onPick={pick} />
      </div>

      {/* mês dir */}
      <div className="rounded-md border p-2">
        <div className="mb-2 flex items-center justify-between">
          <div className="opacity-0 h-7 w-7" />
          <div className="text-sm font-medium">
            {new Date(view.getFullYear(), view.getMonth() + 1, 1).toLocaleDateString("pt-BR", {
              month: "long",
              year: "numeric",
            })}
          </div>
          <button
            type="button"
            className="h-7 w-7 rounded-md hover:bg-accent"
            onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <MonthGrid year={view.getFullYear()} month={view.getMonth() + 1} valueStart={start} valueEnd={end} onPick={pick} />
      </div>

      {/* grade meses + ano */}
      <div className="w-[180px] rounded-md border p-2">
        <div className="mb-1 text-center font-medium">
          <button
            type="button"
            className="rounded px-2 py-0.5 hover:bg-accent"
            title="Selecionar ano inteiro"
            onClick={() => {
              const y = view.getFullYear();
              onChange(new Date(y, 0, 1), new Date(y, 11, 31));
            }}
          >
            {view.getFullYear()}
          </button>
        </div>
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            className="h-7 w-7 rounded-md hover:bg-accent"
            onClick={() => setView(new Date(view.getFullYear() - 1, view.getMonth(), 1))}
            aria-label="Ano anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="h-7 w-7 rounded-md hover:bg-accent"
            onClick={() => setView(new Date(view.getFullYear() + 1, view.getMonth(), 1))}
            aria-label="Próximo ano"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1 text-sm">
          {monthsLabels.map((m, idx) => (
            <button
              key={m}
              type="button"
              className="rounded-md px-2 py-1 text-left hover:bg-accent"
              onClick={() => {
                const a = new Date(view.getFullYear(), idx, 1);
                onChange(new Date(a.getFullYear(), a.getMonth(), 1), new Date(a.getFullYear(), a.getMonth() + 1, 0));
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================ DateRangePicker ============================ */

type Props = {
  value: DateRangeValue;
  onChange: (start: Date, end: Date) => void;
  onApply?: () => void;
  onCancel?: () => void;
  triggerClassName?: string;
  triggerWidth?: number | string; // ex.: 260 ou "260px"
  labelPrefix?: React.ReactNode;  // ex.: "Período:"
  /** Se true, mostra botões “Últimos 7/15/30” e “Apenas Hoje”. Default: true */
  showQuickRanges?: boolean;
};

export function DateRangePicker({
  value,
  onChange,
  onApply,
  onCancel,
  triggerClassName,
  triggerWidth = 260,
  labelPrefix,
  showQuickRanges = true,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [customStart, setCustomStart] = React.useState<string>("");
  const [customEnd, setCustomEnd] = React.useState<string>("");

  React.useEffect(() => {
    if (open) {
      setCustomStart(value.start.toISOString().slice(0, 10));
      setCustomEnd(value.end.toISOString().slice(0, 10));
    }
  }, [open, value.start, value.end]);

  const triggerLabel = `${fmtDate(value.start)} — ${fmtDate(value.end)}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("h-8 gap-2", triggerClassName)}
          style={{ width: typeof triggerWidth === "number" ? `${triggerWidth}px` : triggerWidth }}
        >
          <CalendarIcon className="h-4 w-4" />
          {labelPrefix ? <span className="text-muted-foreground">{labelPrefix}</span> : null}
          <span className="truncate">{triggerLabel}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-3" align="start">
        {/* Quick ranges */}
        {showQuickRanges && (
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Últimos</span>
            {[7, 15, 30].map((n) => (
              <Button
                key={n}
                size="sm"
                variant="outline"
                onClick={() => {
                  const end = new Date();
                  const start = addDays(end, -n + 1);
                  onChange(new Date(start.getFullYear(), start.getMonth(), start.getDate()),
                           new Date(end.getFullYear(), end.getMonth(), end.getDate()));
                }}
              >
                {n}
              </Button>
            ))}
            <span className="ml-1 text-muted-foreground">Dias</span>
            <Button
              variant="link"
              size="sm"
              className="ml-auto"
              onClick={() => {
                const d = new Date();
                const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                onChange(local, local);
              }}
            >
              Apenas Hoje
            </Button>
          </div>
        )}

        {/* Personalizado (inputs) */}
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr_auto_auto] sm:items-end">
          <div>
            <Label className="mb-1 block text-xs">Início</Label>
            <Input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="hidden sm:flex items-center justify-center text-sm text-muted-foreground">—</div>
          <div>
            <Label className="mb-1 block text-xs">Fim</Label>
            <Input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="hidden sm:block" />
          <Button
            variant="outline"
            className="h-8"
            onClick={() => {
              if (customStart && customEnd) {
                const ms = /^(\d{4})-(\d{2})-(\d{2})$/.exec(customStart);
                const me = /^(\d{4})-(\d{2})-(\d{2})$/.exec(customEnd);
                if (ms && me) {
                  const a = new Date(Number(ms[1]), Number(ms[2]) - 1, Number(ms[3]));
                  const b = new Date(Number(me[1]), Number(me[2]) - 1, Number(me[3]));
                  if (!Number.isNaN(+a) && !Number.isNaN(+b) && a <= b) {
                    onChange(a, b);
                  }
                }
              }
            }}
          >
            Aplicar personalizado
          </Button>
        </div>

        {/* Calendário duplo */}
        <CalendarDouble
          start={value.start}
          end={value.end}
          onChange={(a, b) => onChange(a, b)}
        />

        {/* Ações */}
        <div className="mt-3 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => {
              onChange(startOfMonth(new Date()), endOfMonth(new Date()));
              setOpen(false);
              onCancel?.();
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => {
              setOpen(false);
              onApply?.();
            }}
          >
            Aplicar período
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
