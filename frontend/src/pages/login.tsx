import LoginForm from "@/features/auth/login-form";
import { Ship } from "lucide-react";

const Login = () => {
  return (
    <div className="h-screen mx-20 border-border border-x-2 grid grid-rows-[5rem_1fr]">
      <div className="border-border border-b-2 grid grid-cols-[5rem_1fr]">
        <div className="border-border border-r-2 flex items-center justify-center">
          <Ship />
        </div>
        <div />
      </div>

      <div className="grid grid-cols-[5rem_1fr]">
        <div className="border-border border-r-2" />
        <div className="flex items-center justify-center">
          <LoginForm />
        </div>
      </div>
    </div>
  );
};

export default Login;
