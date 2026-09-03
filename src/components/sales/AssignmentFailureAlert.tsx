import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function AssignmentFailureAlert({ reason }: { reason: string }) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="size-4" />
      <AlertTitle>Assignment failed</AlertTitle>
      <AlertDescription>{reason}</AlertDescription>
    </Alert>
  );
}
