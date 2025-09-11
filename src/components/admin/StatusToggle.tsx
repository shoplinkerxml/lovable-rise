import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/providers/i18n-provider";
import { Badge } from "@/components/ui/badge";

interface StatusToggleProps {
  userId: string;
  status: "active" | "inactive";
  onToggle: (userId: string, newStatus: "active" | "inactive") => void;
  disabled?: boolean;
}

export function StatusToggle({ userId, status, onToggle, disabled = false }: StatusToggleProps) {
  const { t } = useI18n();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<"active" | "inactive" | null>(null);

  const handleToggleClick = () => {
    const newStatus = status === "active" ? "inactive" : "active";
    setPendingStatus(newStatus);
    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    if (pendingStatus) {
      onToggle(userId, pendingStatus);
    }
    setShowConfirmDialog(false);
    setPendingStatus(null);
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
    setPendingStatus(null);
  };

  return (
    <>
      {/* Status Display with Toggle */}
      <div className="flex items-center gap-3">
        <Switch
          checked={status === "active"}
          onCheckedChange={handleToggleClick}
          disabled={disabled}
          className="data-[state=checked]:bg-green-600"
        />
        <Badge
          variant={status === "active" ? "default" : "secondary"}
          className={
            status === "active"
              ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-100"
              : "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100"
          }
        >
          {status === "active" ? t("status_active") : t("status_inactive")}
        </Badge>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingStatus === "active" ? t("activate_user") : t("deactivate_user")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatus === "active" 
                ? t("confirm_activate")
                : t("confirm_deactivate")
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>
              {t("btn_cancel")}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirm}
              className={
                pendingStatus === "inactive" 
                  ? "bg-yellow-600 hover:bg-yellow-700" 
                  : "bg-green-600 hover:bg-green-700"
              }
            >
              {pendingStatus === "active" ? t("btn_activate") : t("btn_deactivate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}