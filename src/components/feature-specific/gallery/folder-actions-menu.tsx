"use client";

import { MoreVertical, Edit2, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateFolderAction, deleteFolderAction } from "@/app/admin/(dashboard)/gallery/action";

interface FolderActionsMenuProps {
  folderId: string;
  folderName: string;
}

export function FolderActionsMenu({ folderId, folderName }: FolderActionsMenuProps) {
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [newName, setNewName] = useState(folderName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newName === folderName) {
      setIsRenameOpen(false);
      return;
    }

    setIsSubmitting(true);
    const result = await updateFolderAction(folderId, newName);
    if (result.ok) {
      setIsRenameOpen(false);
    } else {
      setErrorMsg(result.error || "Failed to rename folder");
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    const result = await deleteFolderAction(folderId);
    if (result.ok) {
      setIsDeleteOpen(false);
    } else {
      setErrorMsg(result.error || "Failed to delete folder");
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="p-2 text-slate-500 hover:text-white transition-colors focus:outline-none"
            aria-label="Folder actions"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical size={20} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-[#141416] border-white/10 text-white min-w-[160px]"
        >
          <DropdownMenuItem
            className="hover:bg-white/10 focus:bg-white/10 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setIsRenameOpen(true);
            }}
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Rename Folder
          </DropdownMenuItem>
          <DropdownMenuItem
            className="hover:bg-red-500/20 focus:bg-red-500/20 text-red-500 focus:text-red-500 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setIsDeleteOpen(true);
            }}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="bg-[#0a0a0b] border-white/10 text-white sm:max-w-[425px]">
          <form onSubmit={handleRename}>
            <DialogHeader>
              <DialogTitle>Rename Folder</DialogTitle>
              <DialogDescription className="text-slate-400">
                Enter a new name for your folder.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Folder Name"
                className="bg-white/5 border-white/10 text-white focus-visible:ring-sky-500"
                disabled={isSubmitting}
                autoFocus
              />
              {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRenameOpen(false)}
                className="bg-transparent border-white/10 hover:bg-white/5 hover:text-white"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-sky-500 hover:bg-sky-600 text-white border-0"
                disabled={isSubmitting || !newName.trim()}
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-[#0a0a0b] border-white/10 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete <span className="text-white font-semibold">"{folderName}"</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {errorMsg && <p className="text-sm text-red-500 mb-4">{errorMsg}</p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              className="bg-transparent border-white/10 hover:bg-white/5 hover:text-white"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white border-0"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
