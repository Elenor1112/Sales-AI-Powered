"use client";

import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listOrgUsers } from "@/lib/api/users";

export function UserSelect({
  value,
  onChange,
  placeholder = "Select a user",
  disabled,
}: {
  value: string | undefined;
  onChange: (userId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["org-users"],
    queryFn: () => listOrgUsers(),
  });

  const users = data?.users ?? [];

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v);
      }}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={isLoading ? "Loading..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {users.length === 0 && !isLoading ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">No users found</div>
        ) : (
          users.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.name} &middot; {user.role.replaceAll("_", " ")}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
