import { Outlet } from "react-router-dom";
import Header from "@/components/layout/header";
import { ScrollArea } from "@/components/ui/scroll-area";

const GameLayout = () => {
  return (
    <div className="h-dvh flex flex-col max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 gap-y-2 sm:gap-y-4 overflow-hidden">
      <Header />
      <ScrollArea className="flex-1 min-h-0">
        <div className="pr-3.5">
          <Outlet />
        </div>
      </ScrollArea>
    </div>
  );
};

export default GameLayout;
