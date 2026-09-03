"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LeadFilters as LeadFiltersType } from "@/lib/api/leads";

const STATUS_OPTIONS = ["NEW", "ASSIGNED", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"];
const SOURCE_OPTIONS = ["META", "FACEBOOK", "INSTAGRAM", "WEBSITE", "MANUAL", "OTHER"];
const ASSIGNMENT_STATUS_OPTIONS = ["UNASSIGNED", "ASSIGNED", "REASSIGNMENT_REQUIRED"];

export function LeadFilters({
  filters,
  onChange,
}: {
  filters: LeadFiltersType;
  onChange: (filters: LeadFiltersType) => void;
}) {
  return (
    <div className="glass-card flex flex-wrap items-center gap-2 rounded-xl p-3">
      <div className="relative min-w-56 flex-1">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search leads by name, email, phone..."
          className="pl-8"
          defaultValue={filters.search ?? ""}
          onChange={(e) => onChange({ ...filters, search: e.target.value, page: 1 })}
          aria-label="Search leads"
        />
      </div>
      <Select
        value={filters.status ?? "all"}
        onValueChange={(v) => onChange({ ...filters, status: v === "all" || v === null ? undefined : v, page: 1 })}
      >
        <SelectTrigger className="w-40" aria-label="Filter by status">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.source ?? "all"}
        onValueChange={(v) => onChange({ ...filters, source: v === "all" || v === null ? undefined : v, page: 1 })}
      >
        <SelectTrigger className="w-40" aria-label="Filter by source">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sources</SelectItem>
          {SOURCE_OPTIONS.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.assignmentStatus ?? "all"}
        onValueChange={(v) => onChange({ ...filters, assignmentStatus: v === "all" || v === null ? undefined : v, page: 1 })}
      >
        <SelectTrigger className="w-48" aria-label="Filter by assignment status">
          <SelectValue placeholder="Assignment" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All assignment states</SelectItem>
          {ASSIGNMENT_STATUS_OPTIONS.map((s) => (
            <SelectItem key={s} value={s}>
              {s.replaceAll("_", " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
