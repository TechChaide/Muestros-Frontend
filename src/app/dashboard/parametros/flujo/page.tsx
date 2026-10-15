"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GitBranch, Plus } from "lucide-react";
import FlujoWizard from "./components/flujo-wizard";
import FlujoCatalogoTable from "./components/flujo-catalogo-table";

type ViewMode = "home" | "wizard";

export default function FlujoOperativoPage() {
  const [mode, setMode] = useState<ViewMode>("home");

  if (mode === "wizard") {
    return (
      <FlujoWizard
        onFinished={() => setMode("home")}
        onCancel={() => setMode("home")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 pt-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Flujo operativo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Configura en un solo recorrido la cadena{" "}
            <span className="font-medium text-foreground">
              Área → Motivo (ATM) → Origen → Componente → Causa de defecto
            </span>
            . Debajo puedes consultar el catálogo virtual y filtrarlo por
            departamento y tipo de motivo.
          </p>
          {/*<p className="text-xs text-muted-foreground">
            Ruta:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">
              /dashboard/parametros/flujo
            </code>
            . Si no aparece en el menú lateral, agrega esta ruta en el
            diseñador de menús.
          </p>*/}
          <Button type="button" className="gap-1" onClick={() => setMode("wizard")}>
            <Plus className="h-4 w-4" />
            Configurar flujo
          </Button>
        </CardContent>
      </Card>

      <FlujoCatalogoTable />
    </div>
  );
}
