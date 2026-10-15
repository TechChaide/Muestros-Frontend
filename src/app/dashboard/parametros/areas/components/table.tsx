"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, UserPlus, Trash2, GitBranch, Tag } from 'lucide-react';
import type { Area } from '@/types/interfaces';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useMemo } from 'react';
import Link from 'next/link';

// Helper: separa responsables por ',', 'o' o '&'.
// Se declara también aquí para no acoplarse al del formulario.
function splitResponsables(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/\s*,\s*|\s+[oO]\s+|\s*&\s*/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
const PAGE_SIZE_OPTIONS = [10, 15, 20, 50];

// Mapeo de regional para mostrar en la tabla
const regionalMap: Record<string, string> = {
  'UIO': 'Quito',
  'GYE': 'Guayaquil',
};

interface AreasTableProps {
  records: Area[];
  isLoading: boolean;
  onEdit: (record: Area) => void;
  onAddNew: () => void;
  onDelete: (record: Area) => void;
  onAssociateMotivos: (record: Area) => void;
}

export default function AreasTable({ records, isLoading, onEdit, onAddNew, onDelete, onAssociateMotivos }: AreasTableProps) {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZE_OPTIONS[0]);
  const [filter, setFilter] = useState("");

  // Filtrado: solo registros activos (estado === 'A') y luego por Nombre
  const filteredRecords = useMemo(() => {
    const activos = records.filter(r => r.estado === 'A');
    if (!filter.trim()) return activos;
    const f = filter.toLowerCase();
    return activos.filter(r =>
      (r.nombre_area?.toLowerCase().includes(f) || "")
    );
  }, [records, filter]);

  const totalRows = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredRecords.slice(start, start + rowsPerPage);
  }, [filteredRecords, page, rowsPerPage]);

  // Corrige la página si cambia el número de filas por página o el filtro
  if (page > totalPages && totalPages > 0) setPage(totalPages);

  const renderSkeleton = () => (
    [...Array(5)].map((_, i) => (
        <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
        </TableRow>
    ))
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Listado de Áreas</CardTitle>
            <CardDescription>Áreas registradas en el sistema.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/parametros/flujo" className="inline-flex items-center gap-1">
              <GitBranch className="h-4 w-4" />
              Flujo operativo
            </Link>
          </Button>
          <Button onClick={onAddNew}>
            <UserPlus className="mr-2 h-4 w-4" />
            Añadir Área
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Input de filtrado */}
        <div className="flex justify-between items-center mb-4">
          <input
            type="text"
            className="border rounded px-3 py-2 w-full max-w-xs text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Filtrar por nombre de área..."
            value={filter}
            onChange={e => {
              setFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre del Área</TableHead>
                    <TableHead>Ficha Social</TableHead>
                    <TableHead>Regional</TableHead>
                    <TableHead>Resp. Ctrl. Prod.</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? renderSkeleton() : paginatedRecords.map((record) => (
                    <TableRow key={record.codigo_area}>
                    <TableCell className="font-medium">{record.codigo_area}</TableCell>
                    <TableCell>{record.nombre_area}</TableCell>
                    <TableCell>{record.nombre_ficha_social}</TableCell>
                    <TableCell>{regionalMap[record.regional] || record.regional}</TableCell>
                    <TableCell>
                      {(() => {
                        const responsables = splitResponsables(record.respCtrlProd);
                        if (responsables.length === 0) {
                          return <span className="text-muted-foreground">—</span>;
                        }
                        return (
                          <div className="flex flex-wrap gap-1">
                            {responsables.map((r, i) => (
                              <Badge
                                key={`${record.codigo_area}-resp-${i}`}
                                variant="secondary"
                                className="font-normal"
                              >
                                {r}
                              </Badge>
                            ))}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                        <Badge variant={record.estado === 'A' ? 'default' : 'destructive'} className={record.estado === 'A' ? 'bg-green-600' : ''}>
                         {record.estado === 'A' ? 'Activo' : 'Inactivo'}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(record)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAssociateMotivos(record)}>
                                <Tag className="mr-2 h-4 w-4" />
                                Asociar motivos
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => onDelete(record)}
                                className="text-red-600 focus:text-red-600"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))}
                 {!isLoading && paginatedRecords.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                            No se encontraron áreas.
                        </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
        </div>
        {/* Paginador */}
        <div className="flex items-center justify-end gap-4 mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">Items per page:</span>
            <select
              className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={rowsPerPage}
              onChange={e => {
                setRowsPerPage(Number(e.target.value));
                setPage(1);
              }}
            >
              {PAGE_SIZE_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <span className="text-sm">
            {totalRows === 0
              ? '0'
              : `${(page - 1) * rowsPerPage + 1} – ${Math.min(page * rowsPerPage, totalRows)} of ${totalRows}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              className="p-1 rounded disabled:opacity-50 hover:bg-gray-100"
              onClick={() => setPage(1)}
              disabled={page === 1}
              aria-label="Primera página"
            >
              <span className="sr-only">Primera página</span>
              &#x23ee;
            </button>
            <button
              className="p-1 rounded disabled:opacity-50 hover:bg-gray-100"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Página anterior"
            >
              <span className="sr-only">Página anterior</span>
              &#x2039;
            </button>
            <button
              className="p-1 rounded disabled:opacity-50 hover:bg-gray-100"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Página siguiente"
            >
              <span className="sr-only">Página siguiente</span>
              &#x203a;
            </button>
            <button
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
