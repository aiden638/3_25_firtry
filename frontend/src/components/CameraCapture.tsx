import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, X, RefreshCw } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

const CameraCapture = ({ onCapture, onCancel }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment", // Use back camera if available
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setError(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("카메라에 접근할 수 없습니다. 권한 설정을 확인해 주세요.");
    }
  }, [stream]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const context = canvasRef.current.getContext("2d");
    if (!context) return;
    
    // Set canvas dimensions to match video stream
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    
    // Draw the current video frame to the canvas
    context.drawImage(videoRef.current, 0, 0);
    
    // Convert to Blob and then File
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], "captured_photo.jpg", { type: "image/jpeg" });
        onCapture(file);
      }
    }, "image/jpeg", 0.9);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
      <div className="relative w-full max-w-2xl aspect-[3/4] md:aspect-video bg-muted flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="text-white text-center p-6">
            <p className="mb-4">{error}</p>
            <button 
              onClick={onCancel}
              className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-full transition-colors"
            >
              닫기
            </button>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              onLoadedMetadata={() => setIsReady(true)}
              className="w-full h-full object-cover"
            />
            {/* Guide Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-40 flex items-center justify-center">
              <img 
                src="/leg_guide.png" 
                alt="가이드" 
                className="w-3/4 h-3/4 object-contain mt-8"
              />
            </div>
            
            {!isReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                <RefreshCw className="animate-spin h-8 w-8" />
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-8 flex items-center gap-8">
        <button 
          onClick={onCancel}
          className="p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
          title="취소"
        >
          <X className="h-6 w-6" />
        </button>
        
        <button 
          onClick={capturePhoto}
          disabled={!isReady}
          className="p-8 bg-primary hover:scale-105 active:scale-95 text-primary-foreground rounded-full transition-all shadow-xl disabled:opacity-50 disabled:scale-100"
          title="사진 촬영"
        >
          <Camera className="h-10 w-10" />
        </button>

        <button 
          onClick={startCamera}
          className="p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
          title="카메라 재시작"
        >
          <RefreshCw className="h-6 w-6" />
        </button>
      </div>
      
      <p className="mt-6 text-white/60 text-sm">발 후면이 가이드에 맞춰지도록 촬영해 주세요</p>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraCapture;
