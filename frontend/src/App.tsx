import { Routes, Route } from "react-router-dom";
import { Game, Login, Register } from "./pages";
import GameLayout from "./layouts/game";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/game" element={<GameLayout />}>
        <Route index element={<Game />} />
      </Route>
    </Routes>
  );
}

export default App;
