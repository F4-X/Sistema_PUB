import { useEffect, useState } from "react";
import PDV from "./PDV/PDV.jsx";
import Login from "./Login.jsx";
import Financeiro from "./financeiro/Financeiro.jsx";
import Marcados from "./funcionarios/Marcados.jsx";
import Menu from "./Menu.jsx";
import Fiscal from "./gestao/Fiscal.jsx";

export default function App() {
  const isElectron = navigator.userAgent.includes("Electron");

  const getToken = () =>
    sessionStorage.getItem("token") ||
    localStorage.getItem("token");

  const [ok, setOk] = useState(() => {
    if (isElectron) return false;
    return !!getToken();
  });

  const [tela, setTela] = useState("menu");

  useEffect(() => {
    if (isElectron) {
      sessionStorage.clear();
      localStorage.clear();
      setOk(false);
    }
  }, [isElectron]);

  function sair() {
    sessionStorage.clear();
    localStorage.clear();
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
    return <Marcados setTela={setTela} onLogout={sair} />;
  }

  if (tela === "financeiro") {
    return <Financeiro setTela={setTela} onLogout={sair} />;
  }

  if (tela === "fiscal") {
    return <Fiscal setTela={setTela} onLogout={sair} />;
  }

  return <Menu setTela={setTela} onLogout={sair} />;
}