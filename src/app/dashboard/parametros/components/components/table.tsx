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
import { MoreHorizontal, Edit, UserPlus, GitBranch } from 'lucide-react';
import type { Componente } from '@/types/interfaces';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import Link from 'next/link';
import { splitResponsables } from '@/app/dashboard/parametros/areas/components/form';

const PAGE_SIZE_OPTIONS = [10, 15, 20, 50];

interface ComponentesTableProps {
  records: Componente[];
  isLoading: boolean;
  onEdit: (record: Componente) => void;
  onAddNew: () => void;
  /** Estado controlado desde el padre para sobrevivir al desmontaje. */
  filter: string;
  onFilterChange: (value: string) => void;
  page: number;
  onPageChange: (page: number) => void;
  rowsPerPage: number;
  onRowsPerPageChange: (rows: number) => void;
}

export default function ComponentesTable({
  records,
  isLoading,
  onEdit,
  onAddNew,
  filter,
  onFilterChange,
  page,
  onPageChange,
  rowsPerPage,
  onRowsPerPageChange,
}: ComponentesTableProps) {

  // Filtrado: solo registros activos (estado === 'A') y luego por Nombre
  const filteredRecords = useMemo(() => {
    const activos = records.filter(r => r.estado === 'A');
    if (!filter.trim()) return activos;
    const f = filter.toLowerCase();
    return activos.filter(r =>
      r.nombre_componente?.toLowerCase().includes(f) ||
      r.unidades?.toLowerCase().includes(f) ||
      r.RespCtrlProd?.toLowerCase().includes(f)
    );
  }, [records, filter]);

  const totalRows = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredRecords.slice(start, start + rowsPerPage);
  }, [filteredRecords, page, rowsPerPage]);

  // Corrige la página si cambia el número de filas por página o el filtro
  if (page > totalPages && totalPages > 0) onPageChange(totalPages);

  const renderSkeleton = () => (
    [...Array(5)].map((_, i) => (
        <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
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
            <CardTitle>Listado de Componentes</CardTitle>
            <CardDescription>Componentes registrados en el sistema.</CardDescription>
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
            Añadir Componente
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <input
            type="text"
            className="border rounded px-3 py-2 w-full max-w-xs text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Filtrar por nombre, unidades o responsable..."
            value={filter}
            onChange={e => {
              onFilterChange(e.target.value);
              onPageChange(1);
            }}
          />
        </div>
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre del Componente</TableHead>
                    <TableHead>Unidades</TableHead>
                    <TableHead>Resp. Ctrl. Prod.</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading ? renderSkeleton() : paginatedRecords.map((record) => (
                    <TableRow key={record.codigo_componente}>
                    <TableCell className="font-medium">{record.codigo_componente}</TableCell>
                    <TableCell>{record.nombre_componente}</TableCell>
                    <TableCell>{record.unidades || "—"}</TableCell>
                    <TableCell>
                      {(() => {
                        const responsables = splitResponsables(record.RespCtrlProd);
                        if (responsables.length === 0) {
                          return <span className="text-muted-foreground">—</span>;
                        }
                        return (
                          <div className="flex flex-wrap gap-1">
                            {responsables.map((r, i) => (
                              <Badge
                                key={`${record.codigo_componente}-resp-${i}`}
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
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                ))}
                 {!isLoading && paginatedRecords.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                            No se encontraron componentes.
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
              onChange={e => {
                onRowsPerPageChange(Number(e.target.value));
                onPageChange(1);
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
              onClick={() => onPageChange(1)}
              disabled={page === 1}
              aria-label="Primera página"
            >
              <span className="sr-only">Primera página</span>
              &#x23ee;
            </button>
            <button
              className="p-1 rounded disabled:opacity-50 hover:bg-gray-100"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              aria-label="Página anterior"
            >
              <span className="sr-only">Página anterior</span>
              &#x2039;
            </button>
            <button
              className="p-1 rounded disabled:opacity-50 hover:bg-gray-100"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              aria-label="Página siguiente"
            >
              <span className="sr-only">Página siguiente</span>
              &#x203a;
            </button>
            <button
              className="p-1 rounded disabled:opacity-50 hover:bg-gray-100"
              onClick={() => onPageChange(totalPages)}
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
