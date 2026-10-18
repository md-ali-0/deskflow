"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PRIORITY_LABELS,
  PRIORITY_OPTIONS,
  STATUS_LABELS,
  STATUS_OPTIONS,
  priorityLabel,
  statusLabel,
} from "@/components/status-badge";

const ALL = "ALL";

const STATUS_ITEMS = { [ALL]: "All statuses", ...STATUS_LABELS };
const PRIORITY_ITEMS = { [ALL]: "All priorities", ...PRIORITY_LABELS };

export function TicketFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const applied = useRef(params.get("q") ?? "");

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (!value || value === ALL) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    const query = next.toString();
    router.replace(query ? `/tickets?${query}` : "/tickets");
  }

  useEffect(() => {
    if (search === applied.current) return;

    const timer = setTimeout(() => {
      applied.current = search;
      const next = new URLSearchParams(params.toString());
      if (search) {
        next.set("q", search);
      } else {
        next.delete("q");
      }
      const query = next.toString();
      router.replace(query ? `/tickets?${query}` : "/tickets");
    }, 300);

    return () => clearTimeout(timer);
  }, [search, params, router]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Search subject or number…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="w-64"
      />

      <Select
        items={STATUS_ITEMS}
        value={params.get("status") ?? ALL}
        onValueChange={(value) => setParam("status", String(value))}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {STATUS_OPTIONS.map((status) => (
            <SelectItem key={status} value={status}>
              {statusLabel(status)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={PRIORITY_ITEMS}
        value={params.get("priority") ?? ALL}
        onValueChange={(value) => setParam("priority", String(value))}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All priorities</SelectItem>
          {PRIORITY_OPTIONS.map((priority) => (
            <SelectItem key={priority} value={priority}>
              {priorityLabel(priority)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
