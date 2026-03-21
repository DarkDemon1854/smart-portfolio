"use client";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    destructive?: boolean;
}

export function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "Confirm",
    destructive = false,
}: ConfirmDialogProps) {
    return (
        <Dialog open={open} onClose={onClose} title={title}>
            <p className="text-sm text-slate-400 mb-6">{description}</p>
            <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={onClose}>
                    Cancel
                </Button>
                <Button
                    variant={destructive ? "destructive" : "default"}
                    onClick={() => {
                        onConfirm();
                        onClose();
                    }}
                >
                    {confirmText}
                </Button>
            </div>
        </Dialog>
    );
}
