import { Outlet } from "react-router-dom";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

const GameLayout = () => {
  return (
    <div className="h-screen flex flex-col max-w-4xl my-4 mx-auto gap-y-4">
      <Header />
      <div className="h-full">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
};

export default GameLayout;
