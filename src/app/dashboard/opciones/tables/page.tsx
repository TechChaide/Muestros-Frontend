"use client";

import { useCallback, useState } from "react";
import TablesCatalog, { type ExistingTable } from "./components/tables-catalog";
import TableWizard from "./components/table-wizard";
import ReplicateTableWizard from "./components/replicate-table-wizard";
import TableView from "./components/table-view";
import type { Area } from "@/types/interfaces";

type ViewMode = "catalog" | "create" | "edit" | "replicate" | "view";

export default function TablesPage() {
  /**
   * Modo de vista principal:
   *   - catalog   → lista de áreas con sus tablas
   *   - create    → wizard en blanco, opcionalmente con un área preseleccionada
   *   - edit      → wizard cargando los datos de una tabla existente
   *   - replicate → wizard para copiar tabla + cablear componente en otro ATM
   *   - view      → vista de solo lectura (fija + dinámica en una fila)
   */
  const [mode, setMode] = useState<ViewMode>("catalog");
  const [editingTable, setEditingTable] = useState<ExistingTable | null>(null);
  const [replicatingTable, setReplicatingTable] =
    useState<ExistingTable | null>(null);
  const [viewingTable, setViewingTable] = useState<ExistingTable | null>(null);
  /** Área preseleccionada cuando el usuario hace clic en "Asociar nueva tabla" */
  const [presetArea, setPresetArea] = useState<Area | null>(null);
  /** refreshKey fuerza al catálogo a recargar cuando se guarda una tabla */
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateNew = useCallback((area?: Area) => {
    setEditingTable(null);
    setReplicatingTable(null);
    setViewingTable(null);
    setPresetArea(area ?? null);
    setMode("create");
  }, []);

  const handleEditTable = useCallback((table: ExistingTable) => {
    setEditingTable(table);
    setReplicatingTable(null);
    setViewingTable(null);
    setPresetArea(null);
    setMode("edit");
  }, []);

  const handleReplicateTable = useCallback((table: ExistingTable) => {
    setEditingTable(null);
    setReplicatingTable(table);
    setViewingTable(null);
    setPresetArea(null);
    setMode("replicate");
  }, []);

  const handleViewTable = useCallback((table: ExistingTable) => {
    setEditingTable(null);
    setReplicatingTable(null);
    setViewingTable(table);
    setPresetArea(null);
    setMode("view");
  }, []);

  const handleBackToCatalog = useCallback(() => {
    setEditingTable(null);
    setReplicatingTable(null);
    setViewingTable(null);
    setPresetArea(null);
    setMode("catalog");
  }, []);

  const handleSaved = useCallback(() => {
    setEditingTable(null);
    setReplicatingTable(null);
    setViewingTable(null);
    setPresetArea(null);
    setRefreshKey((k) => k + 1);
    setMode("catalog");
  }, []);

  if (mode === "catalog") {
    return (
      <TablesCatalog
        onCreateNew={handleCreateNew}
        onEditTable={handleEditTable}
        onReplicateTable={handleReplicateTable}
        onViewTable={handleViewTable}
        refreshKey={refreshKey}
      />
    );
  }

  if (mode === "view" && viewingTable) {
    return (
      <TableView
        table={viewingTable}
        onBack={handleBackToCatalog}
        onEdit={handleEditTable}
        onReplicate={handleReplicateTable}
      />
    );
  }

  if (mode === "replicate" && replicatingTable) {
    return (
      <ReplicateTableWizard
        sourceTable={replicatingTable}
        onBackToCatalog={handleBackToCatalog}
        onSaved={handleSaved}
      />
    );
  }

  return (
    <TableWizard
      editingTable={mode === "edit" ? editingTable : null}
      presetArea={mode === "create" ? presetArea : null}
      onBackToCatalog={handleBackToCatalog}
      onSaved={handleSaved}
    />
  );
}
