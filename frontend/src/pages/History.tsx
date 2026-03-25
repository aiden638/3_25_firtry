import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, TrendingDown, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import CountUp from "@/components/CountUp";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface HistoryItem {
  id: string;
  created_at: string;
  score: number;
  level: string;
  left_angle: number;
  right_angle: number;
}

const levelColor: Record<string, string> = {
  정상: "bg-success/10 text-success",
  주의: "bg-warning/10 text-warning",
  위험: "bg-danger/10 text-danger",
};

const History = () => {
  const { isLoggedIn, user } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoggedIn && user) {
      fetchHistory();
    }
  }, [isLoggedIn, user]);

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('history')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching history:", error);
    } else {
      setHistory(data || []);
    }
    setLoading(false);
  };

  if (!isLoggedIn) {
    return (
      <div className="container py-20 flex flex-col items-center text-center gap-6 pb-28">
        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
          <Lock className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold">로그인이 필요합니다</h1>
        <p className="text-muted-foreground max-w-md">
          분석 기록을 확인하고 개선 추이를 추적하려면 로그인하세요.
        </p>
        <Link to="/login">
          <button className="pill-btn-primary">로그인하기</button>
        </Link>
      </div>
    );
  }

  // Prepare chart data (reverse for chronological order)
  const chartData = [...history].reverse().map(item => ({
    date: new Date(item.created_at).toLocaleDateString(),
    score: item.score
  }));

  return (
    <div className="container py-10 md:py-16 max-w-3xl pb-28">
      <h1 className="text-3xl font-bold mb-2">내 기록</h1>
      <p className="text-muted-foreground mb-8">분석 이력과 개선 추이를 확인하세요</p>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-primary" />
            개선 추이
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="date" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full rounded-lg bg-muted/30 flex items-center justify-center text-muted-foreground text-sm italic">
                표시할 데이터가 없습니다
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : history.length > 0 ? (
          history.map((item, i) => (
            <Card key={item.id} className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{new Date(item.created_at).toLocaleDateString()}</p>
                  <p className="text-sm text-muted-foreground">평발 위험도 분석 ({item.left_angle.toFixed(1)}° / {item.right_angle.toFixed(1)}°)</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-primary">
                    <CountUp to={item.score} duration={0.8} delay={i * 0.1} />
                  </span>
                  <span className={cn("px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap", levelColor[item.level])}>
                    {item.level}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            아직 분석 기록이 없습니다. 발 분석을 시작해 보세요!
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
