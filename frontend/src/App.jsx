import { useEffect, useState } from "react";
import PDV from "./PDV/PDV.jsx";
import Login from "./Login.jsx";
import Financeiro from "./financeiro/Financeiro.jsx";
import Marcados from "./funcionarios/Marcados.jsx";
import Menu from "./Menu.jsx";

export default function App() {
  const isElectron = navigator.userAgent.includes("Electron");

  const [ok, setOk] = useState(() => {
    if (isElectron) return false;
    return !!localStorage.getItem("token");
  });

  const [tela, setTela] = useState("menu");

  useEffect(() => {
    if (isElectron) {
      localStorage.removeItem("token");
      setOk(false);
    }
  }, [isElectron]);

  function sair() {
    localStorage.removeItem("token");
    setOk(false);
    setTela("menu");
  }

  if (!ok) {
    return (
      <Login
        onLogin={() => {
          setOk(true);
          setTela("menu");
        }}
      />
    );
  }

  if (tela === "menu") {
    return <Menu setTela={setTela} onLogout={sair} />;
  }

  if (tela === "pdv") {
    return <PDV setTela={setTela} onLogout={sair} />;
  }

  if (tela === "funcionarios") {
    return <Marcados setTela={setTela} />;
  }

  if (tela === "financeiro") {
    return <Financeiro setTela={setTela} />;
  }

  return <Menu setTela={setTela} onLogout={sair} />;
}