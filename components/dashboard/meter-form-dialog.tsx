"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MeterWithReading } from "@/lib/types";
import { meterFormSchema, MeterFormInput, MeterFormValues } from "@/lib/schemas/meter";

interface MeterFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meter?: MeterWithReading | null; // null/undefined = add mode, present = edit mode
  onSuccess: () => void;
}

export function MeterFormDialog({ open, onOpenChange, meter, onSuccess }: MeterFormDialogProps) {
  const isEdit = Boolean(meter);

  const {
  register,
  handleSubmit,
  reset,
  setValue,
  watch,
  formState: { errors, isSubmitting },
} = useForm<MeterFormInput, any, MeterFormValues>({
  resolver: zodResolver(meterFormSchema),
  defaultValues: { name: "", location: "", status: "active", minPowerKw: "", maxPowerKw: "" },
});

async function onSubmit(values: MeterFormValues) {
  // values.minPowerKw / maxPowerKw are already `number | undefined` here — validated output
  const payload = {
    ...values,
    minPowerKw: values.minPowerKw === "" || values.minPowerKw === undefined ? null : values.minPowerKw,
    maxPowerKw: values.maxPowerKw === "" || values.maxPowerKw === undefined ? null : values.maxPowerKw,
  };

  const url = isEdit ? `/api/meters/${meter!.id}` : "/api/meters";
  const method = isEdit ? "PATCH" : "POST";

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    onOpenChange(false);
    onSuccess();
  }
}
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit meter" : "Add meter"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" {...register("location")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={watch("status")} onValueChange={(v) => setValue("status", v as MeterFormValues["status"])}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minPowerKw">Min power (kW)</Label>
              <Input id="minPowerKw" type="number" step="0.1" {...register("minPowerKw")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxPowerKw">Max power (kW)</Label>
              <Input id="maxPowerKw" type="number" step="0.1" {...register("maxPowerKw")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isEdit ? "Save changes" : "Add meter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}