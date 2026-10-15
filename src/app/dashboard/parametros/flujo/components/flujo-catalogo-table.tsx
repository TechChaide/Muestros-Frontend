"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { MuestreoTablaVirtual } from "@/types/interfaces";
import { serviciosMuestreosService } from "@/services/seguridades/serviciosMuestreos.service";

const PAGE_SIZE_OPTIONS = [10, 15, 20, 50];
const ALL = "__all__";

export default function FlujoCatalogoTable() {
  const { toast } = useToast();
  const [rows, setRows] = useState<MuestreoTablaVirtual[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [departamento, setDepartamento] = useState<string>(ALL);
  const [tipoMotivo, setTipoMotivo] = useState<string>(ALL);
  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZE_OPTIONS[0]);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await serviciosMuestreosService.getTablaParamsVirtual();
      setRows((res?.data ?? []) as MuestreoTablaVirtual[]);
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "No se pudo cargar la tabla virtual.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const departamentos = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const name = (r.nombre_area ?? "").trim();
      if (name) set.add(name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [rows]);

  const tiposMotivo = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (departamento !== ALL && r.nombre_area !== departamento) continue;
      const name = (r.nombre_tipo_motivo ?? "").trim();
      if (name) set.add(name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [rows, departamento]);

  useEffect(() => {
    if (tipoMotivo !== ALL && !tiposMotivo.includes(tipoMotivo)) {
      setTipoMotivo(ALL);
    }
  }, [tiposMotivo, tipoMotivo]);

  const filteredRecords = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return rows.filter((r) => {
      if (departamento !== ALL && r.nombre_area !== departamento) return false;
      if (tipoMotivo !== ALL && r.nombre_tipo_motivo !== tipoMotivo) {
        return false;
      }
      if (!q) return true;
      return [
        r.nombre_area,
        r.nombre_tipo_motivo,
        r.nombre_origen,
        r.nombre_componente,
        r.nombre_causa_defecto,
      ].some((value) => (value ?? "").toLowerCase().includes(q));
    });
  }, [rows, departamento, tipoMotivo, busqueda]);

  const totalRows = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredRecords.slice(start, start + rowsPerPage);
  }, [filteredRecords, page, rowsPerPage]);

  if (page > totalPages && totalPages > 0) setPage(totalPages);

  const renderSkeleton = () =>
    [...Array(5)].map((_, i) => (
      <TableRow key={i}>
        <TableCell>
          <Skeleton className="h-4 w-28" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-32" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-36" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-28" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-40" />
        </TableCell>
      </TableRow>
    ));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Catálogo de flujo</CardTitle>
          <CardDescription>
            Combinaciones Área → Motivo → Origen → Componente → Causa
            (getTablaParamsVirtual).
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void load()}
          disabled={isLoading}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar departamento, motivo, origen, componente o causa..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPage(1);
              }}
              aria-label="Buscar en el catálogo de flujo"
            />
          </div>
          <select
            className="border rounded px-3 py-2 w-full max-w-xs text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={departamento}
            onChange={(e) => {
              setDepartamento(e.target.value);
              setPage(1);
            }}
            aria-label="Filtrar por departamento"
          >
            <option value={ALL}>Todos los departamentos</option>
            {departamentos.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            className="border rounded px-3 py-2 w-full max-w-xs text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={tipoMotivo}
            onChange={(e) => {
              setTipoMotivo(e.target.value);
              setPage(1);
            }}
            aria-label="Filtrar por tipo de motivo"
          >
            <option value={ALL}>Todos los tipos de motivo</option>
            {tiposMotivo.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Departamento</TableHead>
                <TableHead>Tipo de motivo</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Componente</TableHead>
                <TableHead>Causa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? renderSkeleton()
                : paginatedRecords.map((record, idx) => (
                    <TableRow
                      key={`${record.codigo_origen_componente}-${record.codigo_causa_defecto}-${idx}`}
                    >
                      <TableCell className="font-medium">
                        {record.nombre_area}
                      </TableCell>
                      <TableCell>{record.nombre_tipo_motivo}</TableCell>
                      <TableCell>{record.nombre_origen}</TableCell>
                      <TableCell>{record.nombre_componente}</TableCell>
                      <TableCell>{record.nombre_causa_defecto}</TableCell>
                    </TableRow>
                  ))}
              {!isLoading && paginatedRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No se encontraron registros.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-end gap-4 mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">Items per page:</span>
            <select
              className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
              type="button"
              className="p-1 rounded disabled:opacity-50 hover:bg-gray-100"
              onClick={() => setPage(1)}
              disabled={page === 1}
              aria-label="Primera página"
            >
              <span className="sr-only">Primera página</span>
              &#x23ee;
            </button>
            <button
              type="button"
              className="p-1 rounded disabled:opacity-50 hover:bg-gray-100"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Página anterior"
            >
              <span className="sr-only">Página anterior</span>
              &#x2039;
            </button>
            <button
              type="button"
              className="p-1 rounded disabled:opacity-50 hover:bg-gray-100"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Página siguiente"
            >
              <span className="sr-only">Página siguiente</span>
              &#x203a;
            </button>
            <button
              type="button"
              className="p-1 rounded disabled:opacity-50 hover:bg-gray-100"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              aria-label="Última página"
            >
              <span className="sr-only">Última página</span>
              &#x23ed;
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
