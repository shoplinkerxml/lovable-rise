import React from "react";
import { Switch } from "@/components/ui/switch";
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

  const handleToggle = (checked: boolean) => {
    const newStatus = checked ? "active" : "inactive";
    onToggle(userId, newStatus);
  };

  return (
    <div className="flex items-center gap-3">
      <Switch
        checked={status === "active"}
        onCheckedChange={handleToggle}
        disabled={disabled}
        className="data-[state=checked]:bg-emerald-200 data-[state=unchecked]:bg-input"
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
  );
}