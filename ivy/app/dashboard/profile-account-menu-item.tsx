"use client";

import { useClerk } from "@clerk/nextjs";
import { UserRound } from "lucide-react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function ProfileAccountMenuItem() {
  const clerk = useClerk();

  return (
    <DropdownMenuItem onClick={() => clerk.openUserProfile()}>
      <UserRound className="size-4" />
      Account
    </DropdownMenuItem>
  );
}
