"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileSpreadsheet, UserPlus } from "lucide-react";
import type { MaquinasMantenimiento } from "@/types/interfaces";

const PAGE_SIZE_OPTIONS = [10, 15, 20, 50];

const regionalMap: Record<string, string> = {
  UIO: "Quito",
  GYE: "Guayaquil",
};

interface MachinesTableProps {
  records: MaquinasMantenimiento[];
  isLoading: boolean;
  onAddNew: () => void;
  onBulkUpload: () => void;
}

export default function MachinesTable({
  records,
  isLoading,
  onAddNew,
  onBulkUpload,
}: MachinesTableProps) {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZE_OPTIONS[0]);
  const [filter, setFilter] = useState("");

  const filteredRecords = useMemo(() => {
    if (!filter.trim()) return records;
    const f = filter.toLowerCase();
    return records.filter(
      (r) =>
        r.maquina?.toLowerCase().includes(f) ||
        r.componente?.toLowerCase().includes(f) ||
        r.actividad?.toLowerCase().includes(f) ||
        r.regional?.toLowerCase().includes(f),
    );
  }, [records, filter]);

  const totalRows = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredRecords.slice(start, start + rowsPerPage);
  }, [filteredRecords, page, rowsPerPage]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const renderSkeleton = () =>
    [...Array(5)].map((_, i) => (
      <TableRow key={i}>
        <TableCell>
          <Skeleton className="h-4 w-16" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-48" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-28" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-16" />
        </TableCell>
      </TableRow>
    ));

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Máquinas registradas</CardTitle>
          <CardDescription>
            Catálogo usado en paros de máquina. Puedes crear una o cargar un Excel.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={onBulkUpload}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Carga masiva
          </Button>
          <Button type="button" onClick={onAddNew}>
            <UserPlus className="mr-2 h-4 w-4" />
            Añadir máquina
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <input
            type="text"
            className="w-full max-w-xs rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Filtrar por máquina, componente, actividad..."
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Máquina</TableHead>
                <TableHead>Componente</TableHead>
                <TableHead>Actividad</TableHead>
                <TableHead>Regional</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? renderSkeleton()
                : paginatedRecords.map((record, idx) => (
                    <TableRow
                      key={`${record.id_maq}-${record.maquina}-${idx}`}
                    >
                      <TableCell className="font-medium">
                        {record.maquina}
                      </TableCell>
                      <TableCell>{record.componente}</TableCell>
                      <TableCell>{record.actividad}</TableCell>
                      <TableCell>
                        {regionalMap[record.regional] || record.regional}
                      </TableCell>
                    </TableRow>
                  ))}
              {!isLoading && paginatedRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No hay máquinas registradas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 flex items-center justify-end gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">Items per page:</span>
            <select
              className="rounded border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(1);
              }}
            >
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <span className="text-sm">
            {totalRows === 0
              ? "0"
              : `${(page - 1) * rowsPerPage + 1} – ${Math.min(
                  page * rowsPerPage,
                  totalRows,
                )} of ${totalRows}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              className="rounded p-1 hover:bg-gray-100 disabled:opacity-50"
              onClick={() => setPage(1)}
              disabled={page === 1}
              aria-label="Primera página"
            >
              &#x23ee;
            </button>
            <button
              className="rounded p-1 hover:bg-gray-100 disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Página anterior"
            >
              &#x2039;
            </button>
            <button
              className="rounded p-1 hover:bg-gray-100 disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Página siguiente"
            >
              &#x203a;
            </button>
            <button
              className="rounded p-1 hover:bg-gray-100 disabled:opacity-50"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              aria-label="Última página"
            >
              &#x23ed;
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
