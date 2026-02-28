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
      "flex flex-col items-center gap-1 rounded-base border-2 border-border p-4 shadow-shadow",
      className,
    )}
  >
    <div className="flex items-center gap-2 text-sm opacity-70">
      {icon}
      {label}
    </div>
    <span className="text-2xl font-heading">{value}</span>
  </div>
);

export default StatCard;
