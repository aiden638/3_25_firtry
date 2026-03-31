import { useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, ImageIcon, RotateCcw, AlertTriangle, CheckCircle, Info, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import CountUp from "@/components/CountUp";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import CameraCapture from "@/components/CameraCapture";

type RiskLevel = "정상" | "주의" | "위험";

interface AnalysisResult {
  score: number;
  level: RiskLevel;
  description: string;
  annotatedImage: string;
  leftAngle: number;
  rightAngle: number;
}

const getLevelAndDescription = (score: number) => {
  let level: RiskLevel;
  let description: string;

  if (score <= 35) {
    level = "정상";
    description = "발 아치가 정상 범위에 있습니다. 현재 상태를 유지하기 위해 적절한 운동을 권장합니다.";
  } else if (score <= 65) {
    level = "주의";
    description = "평발 경향이 일부 감지되었습니다. 전문가 상담을 통해 정확한 진단을 받아보시는 것을 권장합니다.";
  } else {
    level = "위험";
    description = "평발 위험도가 높게 나타났습니다. 가까운 정형외과 전문의 상담을 강력히 권장합니다.";
  }
  return { level, description };
};

const generateDummyResult = (): AnalysisResult => {
  const score = Math.floor(Math.random() * 100);
  const { level, description } = getLevelAndDescription(score);
  return {
    score,
    level,
    description,
    annotatedImage: "",
    leftAngle: 0,
    rightAngle: 0
  };
};

const levelConfig: Record<RiskLevel, { color: string; icon: typeof CheckCircle }> = {
  정상: { color: "text-success", icon: CheckCircle },
  주의: { color: "text-warning", icon: Info },
  위험: { color: "text-danger", icon: AlertTriangle },
};

const Analysis = () => {
  const [image, setImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) return;
    setFile(selectedFile);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      setResult(null);
    };
    reader.readAsDataURL(selectedFile);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );


  const { user } = useAuth();

  const onAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

    try {
      const response = await fetch(`${apiBaseUrl}/predict`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '분석 중 오류가 발생했습니다.');
      }

      const data = await response.json();
      const { level, description } = getLevelAndDescription(data.prediction_percent);

      const newResult: AnalysisResult = {
        score: Math.round(data.prediction_percent),
        level,
        description,
        annotatedImage: data.annotated_image,
        leftAngle: data.left.angle,
        rightAngle: data.right.angle
      };

      setResult(newResult);

      // Save to Supabase if logged in
      if (user) {
        const { error: saveError } = await supabase
          .from('history')
          .insert([
            {
              user_id: user.id,
              score: newResult.score,
              level: newResult.level,
              left_angle: newResult.leftAngle,
              right_angle: newResult.rightAngle,
              description: newResult.description,
            }
          ]);

        if (saveError) {
          console.error("Error saving history:", saveError);
          // Don't throw here, just log it so the user still sees their result
        }
      }
    } catch (err: any) {
      setError(err.message);
      console.error("Analysis error:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const onReset = () => {
    setImage(null);
    setFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="container py-10 md:py-16 pb-28">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-2">발 분석</h1>
        <p className="text-muted-foreground">발 후면 사진을 업로드하여 평발 위험도를 확인하세요</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {/* Preview */}
        <Card className="overflow-hidden">
          <CardContent className="p-0 aspect-[4/3] flex items-center justify-center bg-muted/30">
            {result?.annotatedImage ? (
              <img src={`data:image/jpeg;base64,${result.annotatedImage}`} alt="분석 이미지" className="w-full h-full object-contain" />
            ) : image ? (
              <img src={image} alt="업로드된 발 사진" className="w-full h-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <ImageIcon className="h-16 w-16 opacity-30" />
                <span className="text-sm">사진이 여기에 표시됩니다</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upload */}
        <div className="flex flex-col gap-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex-1 min-h-[200px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300",
              dragOver
                ? "border-primary bg-primary/5 scale-[1.02]"
                : "border-border hover:border-primary/50 hover:bg-muted/30 hover:scale-[1.01]"
            )}
          >
            <Upload className="h-10 w-10 text-primary/60" />
            <div className="text-center">
              <p className="font-medium">사진을 드래그하거나 클릭하세요</p>
              <p className="text-sm text-muted-foreground mt-1">JPG, PNG (최대 10MB)</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowCamera(true)}
              className="pill-btn-glass flex-1 flex items-center justify-center gap-2"
            >
              <Camera className="h-4 w-4" />
              직접 촬영하기
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onAnalyze}
              disabled={!image || analyzing}
              className="pill-btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {analyzing ? "분석 중..." : "분석하기"}
            </button>
            {image && (
              <button className="pill-btn-glass" onClick={onReset}>
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
          </div>
          {error && <p className="text-sm text-danger mt-2 text-center">{error}</p>}
        </div>
      </div>

      {/* Results with CountUp */}
      {result && (
        <Card className="max-w-5xl mx-auto mt-8 animate-fade-in">
          <CardContent className="p-6 md:p-8">
            <h2 className="text-xl font-bold mb-6">분석 결과</h2>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">평발 위험도 점수</p>
                <div className="text-5xl font-bold text-primary mb-3">
                  <CountUp to={result.score} duration={1} separator="," />
                </div>
                <Progress value={result.score} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>낮음</span>
                  <span>높음</span>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center text-center">
                <p className="text-sm text-muted-foreground mb-2">위험 단계</p>
                {(() => {
                  const config = levelConfig[result.level];
                  const Icon = config.icon;
                  return (
                    <div className={cn("flex items-center gap-2 text-2xl font-bold", config.color)}>
                      <Icon className="h-7 w-7" />
                      {result.level}
                    </div>
                  );
                })()}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-4">상세 정보</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm p-3 bg-muted/30 rounded-lg">
                    <span>왼발 각도</span>
                    <span className="font-bold">{result.leftAngle.toFixed(2)}°</span>
                  </div>
                  <div className="flex justify-between items-center text-sm p-3 bg-muted/30 rounded-lg">
                    <span>오른발 각도</span>
                    <span className="font-bold">{result.rightAngle.toFixed(2)}°</span>
                  </div>
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground mb-1">설명</p>
                    <p className="text-sm leading-relaxed">{result.description}</p>
                  </div>
                </div>
              </div>
            </div>


          </CardContent>
        </Card>
      )}

      {showCamera && (
        <CameraCapture
          onCapture={(file) => {
            handleFile(file);
            setShowCamera(false);
          }}
          onCancel={() => setShowCamera(false)}
        />
      )}
    </div>
  );
};

export default Analysis;
