import { LoadingButton } from "@/components/ui/loading-button";
import type { VariantProps } from "class-variance-authority";
import type { buttonVariants } from "@/components/ui/button";

interface SubmitButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isSubmitting?: boolean;
  children: React.ReactNode;
  loadingText?: string;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({
  isSubmitting = false,
  children,
  loadingText,
  variant,
  size,
  className = "w-full",
  ...props
}) => {
  return (
    <LoadingButton
      type="submit"
      variant={variant}
      size={size}
      loading={isSubmitting}
      loadingText={
        loadingText ?? (typeof children === "string" ? children : "Loading...")
      }
      className={className}
      {...props}
    >
      {children}
    </LoadingButton>
  );
};

export { SubmitButton };
