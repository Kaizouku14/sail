import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import React from "react";

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isSubmitting?: boolean;
  children: React.ReactNode;
  loadingText?: string;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  isSubmitting = false,
  children,
  loadingText,
  ...props
}) => {
  return (
    <Button type="submit" disabled={isSubmitting} className="w-full" {...props}>
      {isSubmitting ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          {loadingText || children}
        </span>
      ) : (
        children
      )}
    </Button>
  );
};
