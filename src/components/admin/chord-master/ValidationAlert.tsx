import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Info, CheckCircle } from "lucide-react";

interface ValidationAlertProps {
  type: "error" | "warning" | "success";
  title: string;
  message: string;
  className?: string;
}

const ValidationAlert = ({ type, title, message, className }: ValidationAlertProps) => {
  const getIcon = () => {
    switch (type) {
      case "error":
        return <AlertTriangle className="h-4 w-4" />;
      case "warning":
        return <Info className="h-4 w-4" />;
      case "success":
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getVariant = () => {
    switch (type) {
      case "error":
        return "destructive";
      case "warning":
        return "default";
      case "success":
        return "default";
    }
  };

  return (
    <Alert variant={getVariant()} className={className}>
      {getIcon()}
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
};

export default ValidationAlert;