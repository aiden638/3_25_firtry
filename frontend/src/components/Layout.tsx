import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Footer from "./Footer";
import Dock from "./Dock";
import StaggeredMenu from "./StaggeredMenu";
import { Home, Activity, Clock, LogIn } from "lucide-react";

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";

  const dockItems = [
    {
      icon: <Home className="h-5 w-5 text-primary" />,
      label: "홈",
      onClick: () => navigate("/"),
    },
    {
      icon: <Activity className="h-5 w-5 text-primary" />,
      label: "발 분석",
      onClick: () => navigate("/analysis"),
    },
    {
      icon: <Clock className="h-5 w-5 text-primary" />,
      label: "내 기록",
      onClick: () => navigate("/history"),
    },
    {
      icon: <LogIn className="h-5 w-5 text-primary" />,
      label: "로그인",
      onClick: () => navigate("/login"),
    },
  ];

  const menuItems = [
    { label: "홈", link: "/", onClick: () => navigate("/") },
    { label: "발 분석", link: "/analysis", onClick: () => navigate("/analysis") },
    { label: "내 기록", link: "/history", onClick: () => navigate("/history") },
    { label: "로그인", link: "/login", onClick: () => navigate("/login") },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <StaggeredMenu items={menuItems} />
      <main className="flex-1">
        <Outlet />
      </main>
      {!isHome && <Footer />}
      <Dock items={dockItems} />
    </div>
  );
};

export default Layout;
