import { Link } from "react-router-dom";
import { ArrowRight, Users } from "lucide-react";
import Iridescence from "@/components/Iridescence";
import ProfileCard from "@/components/ProfileCard";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";

const exampleUsers = [
  { name: "김민수", score: 28, level: "정상" },
  { name: "이서연", score: 52, level: "주의" },
  { name: "박지훈", score: 74, level: "위험" },
  { name: "최유진", score: 35, level: "정상" },
  { name: "정하늘", score: 61, level: "주의" },
  { name: "한소희", score: 18, level: "정상" },
];

const Index = () => {
  const { isLoggedIn } = useAuth();

  return (
    <div className="h-screen h-[100dvh] overflow-y-auto snap-y snap-proximity md:snap-mandatory">
      {/* Hero with Iridescence */}
      <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden snap-start snap-always pb-32 md:pb-0">
        <div className="absolute inset-0">
          <Iridescence
            color={[0.2, 0.8, 0.6]}
            speed={0.15}
            amplitude={0.08}
            mouseReact={true}
          />
        </div>
        <div className="absolute inset-0 bg-black/30" />

        <div className="relative z-10 text-center px-6 max-w-2xl">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-white/60 mb-3">
            AI 기반 평발 분석 서비스
          </p>

          <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6">
            발 사진 한 장으로
            <br />
            평발 위험도를 확인하세요
          </h1>

          <p className="text-white/50 text-sm max-w-md mx-auto mb-8">
            간편한 사진 촬영만으로 AI가 평발 위험 척도를 분석합니다.
            조기 발견으로 건강한 발을 유지하세요.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/analysis">
              <button className="pill-btn-primary text-sm px-6 py-2.5">
                분석 시작하기 <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </Link>
            <Link to={isLoggedIn ? "/history" : "/login"}>
              <button className="pill-btn-glass text-sm px-6 py-2.5 !bg-white/5 !text-white !border-white/10 hover:!bg-white/10 transition-all">
                {isLoggedIn ? "내 기록 보기" : "자세히 알아보기"}
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Steps section */}
      <section className="min-h-[100dvh] flex items-center snap-start snap-always bg-background py-16 md:py-0 pb-40 md:pb-0">
        <div className="container">
          <div className="text-center mb-8 md:mb-12">
            <p className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">How it works</p>
            <h2 className="text-2xl font-bold mt-2">이용 방법</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { step: 1, title: "발 사진 촬영", desc: "발 후면을 카메라로 촬영하거나 사진을 업로드하세요." },
              { step: 2, title: "AI 분석", desc: "업로드된 사진을 기반으로 평발 위험도를 분석합니다." },
              { step: 3, title: "결과 확인", desc: "분석 결과와 위험도 점수를 확인하고 전문가 상담을 받으세요." },
            ].map((item) => (
              <div
                key={item.step}
                className="flex flex-col items-center text-center gap-2 md:gap-3 p-4 md:p-6 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
              >
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="text-base md:text-lg font-bold text-primary">{item.step}</span>
                </div>
                <h3 className="font-bold text-sm md:text-base">{item.title}</h3>
                <p className="text-[11px] md:text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* User comparison section */}
      <section className="min-h-[100dvh] flex items-center snap-start snap-always bg-background py-16 md:py-0 pb-40 md:pb-0">
        <div className="container">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 text-muted-foreground mb-2">
              <Users className="h-4 w-4" />
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Community</span>
            </div>
            <h2 className="text-2xl font-bold">다른 사용자들과 비교해 보세요</h2>
            <p className="text-muted-foreground mt-2 text-sm max-w-md mx-auto">
              로그인 후 나의 평발 위험도를 다른 사용자들과 비교하고 개선 추이를 확인하세요.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {exampleUsers.map((user, i) => (
              <ProfileCard key={i} name={user.name} score={user.score} level={user.level} />
            ))}
          </div>

          {!isLoggedIn && (
            <div className="text-center mt-8">
              <Link to="/login">
                <button className="pill-btn-primary text-sm px-6 py-2.5">
                  로그인하고 비교하기 <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="min-h-[100dvh] md:h-screen flex flex-col snap-start snap-always bg-background py-16 md:py-0 pb-40 md:pb-0">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4 text-sm">지금 바로 무료로 분석해 보세요</p>
            <Link to="/analysis">
              <button className="pill-btn-glass text-sm px-6 py-2.5">
                발 분석 페이지로 이동 <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer - only visible after all snap sections */}
      <section className="snap-start snap-always">
        <Footer />
      </section>
    </div>
  );
};

export default Index;
