import { Link, useLocation } from "react-router-dom";
import { Footprints, Menu, X, LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { label: "홈", path: "/" },
  { label: "발 분석", path: "/analysis" },
  { label: "내 기록", path: "/history" },
];

const Navbar = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isLoggedIn, userName, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Footprints className="h-7 w-7 text-primary" />
          <span className="text-lg font-bold text-foreground">풋케어 AI</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                location.pathname === item.path
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {item.label}
            </Link>
          ))}
          {isLoggedIn ? (
            <div className="flex items-center gap-2 ml-2">
              <span className="text-sm text-muted-foreground">{userName}님</span>
              <Button size="sm" variant="outline" onClick={logout} className="gap-1">
                <LogOut className="h-3.5 w-3.5" /> 로그아웃
              </Button>
            </div>
          ) : (
            <Link to="/login">
              <Button size="sm" className="ml-2">로그인</Button>
            </Link>
          )}
        </nav>

        <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <nav className="md:hidden border-t bg-background px-4 pb-4 pt-2 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "block px-4 py-2.5 rounded-md text-sm font-medium transition-colors",
                location.pathname === item.path
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {item.label}
            </Link>
          ))}
          {isLoggedIn ? (
            <Button size="sm" variant="outline" className="w-full mt-2 gap-1" onClick={() => { logout(); setMobileOpen(false); }}>
              <LogOut className="h-3.5 w-3.5" /> 로그아웃 ({userName})
            </Button>
          ) : (
            <Link to="/login" onClick={() => setMobileOpen(false)}>
              <Button size="sm" className="w-full mt-2">로그인</Button>
            </Link>
          )}
        </nav>
      )}
    </header>
  );
};

export default Navbar;
