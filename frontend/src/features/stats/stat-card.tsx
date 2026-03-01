import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  className?: string;
}

const StatCard = ({ label, value, icon, className }: StatCardProps) => (
  <div
    className={cn(
      "flex flex-col items-center gap-1 rounded-base border-2 border-border p-2.5 sm:p-4 shadow-shadow",
      className,
    )}
  >
    <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm opacity-70">
      {icon}
      {label}
    </div>
    <span className="text-xl sm:text-2xl font-heading">{value}</span>
  </div>
);

export default StatCard;
