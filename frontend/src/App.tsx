import { Routes, Route } from "react-router-dom";
import { Toaster } from "sileo";
import { Game, Login, Register } from "./pages";
import AuthLayout from "./layouts/auth";
import GameLayout from "./layouts/game";

function App() {
  return (
    <>
      <Toaster
        position="top-center"
        options={{
          fill: "var(--main-foreground)",
        }}
      />

      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route path="/game" element={<GameLayout />}>
          <Route index element={<Game />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
