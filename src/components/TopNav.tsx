"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";


export default function TopNav() {
return (
<header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur border-b">
<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
{/* Left: logo */}
<div className="flex items-center gap-6">
<Link href="/dashboard" className="text-xl font-semibold">BPO</Link>
</div>
{/* Right: usuário fake (seu UserMenu já está no AppShell) */}
<div className="text-sm text-gray-500">Olá, Usuário</div>
</div>
</header>
);
}