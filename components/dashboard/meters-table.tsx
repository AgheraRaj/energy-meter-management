"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  SortingState,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getMeterColumns } from "./meters-columns";
import { MeterFormDialog } from "./meter-form-dialog";
import { DeleteMeterDialog } from "./delete-meter-dialog";
import { MeterWithReading } from "@/lib/types";

export function MetersTable({ initialMeters }: { initialMeters: MeterWithReading[] }) {
  const router = useRouter();
  const [meters, setMeters] = useState(initialMeters);
  const [sorting, setSorting] = useState<SortingState>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingMeter, setEditingMeter] = useState<MeterWithReading | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [meterToDelete, setMeterToDelete] = useState<MeterWithReading | null>(null);

  // Keeps the table in sync after router.refresh() re-fetches initialMeters server-side.
  useEffect(() => {
    setMeters(initialMeters);
  }, [initialMeters]);

  function refresh() {
    router.refresh();
  }

  function handleAdd() {
    setEditingMeter(null);
    setFormOpen(true);
  }

  function handleEdit(meter: MeterWithReading) {
    setEditingMeter(meter);
    setFormOpen(true);
  }

  function handleDeleteClick(meter: MeterWithReading) {
    setMeterToDelete(meter);
    setDeleteOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!meterToDelete) return;
    await fetch(`/api/meters/${meterToDelete.id}`, { method: "DELETE" });
    setDeleteOpen(false);
    setMeterToDelete(null);
    refresh();
  }

  const columns = getMeterColumns({ onEdit: handleEdit, onDelete: handleDeleteClick });

  const table = useReactTable({
    data: meters,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add meter
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/meters/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No meters yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>

      <MeterFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        meter={editingMeter}
        onSuccess={refresh}
      />
      <DeleteMeterDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        meterName={meterToDelete?.name ?? ""}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}