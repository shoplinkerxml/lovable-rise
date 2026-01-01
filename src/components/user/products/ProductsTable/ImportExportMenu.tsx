import { useCallback, useState } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { useOutletContext } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Upload } from "lucide-react";
import type { ProductRow } from "./columns";

import { ImportExportDialog } from "./ImportExportDialog";

export function ImportExportMenu({
  t,
  storeId,
  queryClient,
  selectedProducts,
  disabled,
}: {
  t: (k: string) => string;
  storeId?: string;
  queryClient: QueryClient;
  selectedProducts?: ProductRow[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { user } = useOutletContext<{ user: { id?: string } | null }>();
  const uid = user?.id ? String(user.id) : "current";
  const onClick = useCallback(() => setOpen(true), []);
  return (
    <>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-transparent"
              onClick={onClick}
              aria-label={t("import_export_title")}
              disabled={!!disabled}
              aria-disabled={!!disabled}
              data-testid="user_products_import_export_open"
            >
              <Upload className={`h-4 w-4 transition-colors ${disabled ? "text-muted-foreground" : "text-foreground hover:text-primary"}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-sm">
            {t("import_export_title")}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <ImportExportDialog
        open={open}
        onOpenChange={setOpen}
        t={t}
        storeId={storeId}
        userId={uid}
        queryClient={queryClient}
        selectedProducts={selectedProducts}
      />
    </>
  );
}
