"use client";

import * as React from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

type Props = {
  value: DateRange;                          // { from: Date; to: Date }
  onChange: (range: DateRange | undefined) => void;
  label?: string;
};

export function DateRangePicker({ value, onChange, label = "Período" }: Props) {
  const [open, setOpen] = React.useState(false);

  const currentMonthRange: DateRange = React.useMemo(() => {
    const today = new Date();
    return { from: startOfMonth(today), to: endOfMonth(today) };
  }, []);

  const display = React.useMemo(() => {
    if (value?.from && value?.to) {
      return `${format(value.from, "dd/MM/yyyy", { locale: ptBR })} — ${format(value.to, "dd/MM/yyyy", { locale: ptBR })}`;
    }
    if (value?.from) {
      return format(value.from, "dd/MM/yyyy", { locale: ptBR });
    }
    return "Selecionar período";
  }, [value]);

  return (
    <div className="flex items-center gap-3">
      {label && <span className="text-sm text-muted-foreground">{label}</span>}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="min-w-[260px] justify-between rounded-xl border-muted-foreground/20 shadow-sm hover:shadow"
          >
            <span className="truncate">{display}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="size-4 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Button>
        </PopoverTrigger>

        <PopoverContent align="end" className="p-3 w-auto rounded-2xl shadow-xl">
          <div className="flex items-center justify-between gap-3 px-1 pb-2">
            <Button
              variant="secondary"
              className="rounded-lg"
              onClick={() => onChange(currentMonthRange)}
            >
              Mês atual
            </Button>
            <Button
              variant="ghost"
              className="rounded-lg"
              onClick={() => onChange(undefined)}
            >
              Limpar
            </Button>
          </div>

          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={value}
            onSelect={(range) => onChange(range)}
            defaultMonth={value?.from ?? currentMonthRange.from}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// helper para iniciar páginas com o mês atual
export function getCurrentMonthRange(): DateRange {
  const today = new Date();
  return { from: startOfMonth(today), to: endOfMonth(today) };
}
