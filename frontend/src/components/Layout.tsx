import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Footer from "./Footer";
import Dock from "./Dock";
import StaggeredMenu from "./StaggeredMenu";
import { Home, Activity, Clock, LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const { isLoggedIn, logout } = useAuth();

  const handleLogout = () => {
    const confirmLogout = window.confirm("로그아웃 하시겠습니까?");
    if (confirmLogout) {
      logout();
      navigate("/");
    }
  };

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
      icon: isLoggedIn ? <LogOut className="h-5 w-5 text-primary" /> : <LogIn className="h-5 w-5 text-primary" />,
      label: isLoggedIn ? "로그아웃" : "로그인",
      onClick: isLoggedIn ? handleLogout : () => navigate("/login"),
    },
  ];

  const menuItems = [
    { label: "홈", link: "/", onClick: () => navigate("/") },
    { label: "발 분석", link: "/analysis", onClick: () => navigate("/analysis") },
    { label: "내 기록", link: "/history", onClick: () => navigate("/history") },
    { 
      label: isLoggedIn ? "로그아웃" : "로그인", 
      link: isLoggedIn ? "#" : "/login", 
      onClick: isLoggedIn ? handleLogout : () => navigate("/login") 
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <StaggeredMenu items={menuItems} />
      <main className="flex-1 pb-28 md:pb-0">
        <Outlet />
        {!isHome && <Footer />}
      </main>
      <Dock items={dockItems} />
    </div>
  );
};

export default Layout;
