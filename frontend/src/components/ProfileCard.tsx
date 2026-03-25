import { cn } from "@/lib/utils";

interface ProfileCardProps {
  name: string;
  score: number;
  level: string;
  avatarUrl?: string;
  className?: string;
}

const levelColor: Record<string, string> = {
  정상: "bg-success/10 text-success border-success/30",
  주의: "bg-warning/10 text-warning border-warning/30",
  위험: "bg-destructive/10 text-destructive border-destructive/30",
};

export default function ProfileCard({ name, score, level, avatarUrl, className }: ProfileCardProps) {
  return (
    <div
      className={cn(
        "group relative rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
        className
      )}
    >
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg font-bold text-primary">{name[0]}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-bold text-primary">{score}</span>
            <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold border", levelColor[level])}>
              {level}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3 w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-700"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
