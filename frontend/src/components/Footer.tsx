import { Link } from "react-router-dom";
import { Footprints, Mail, MapPin, Phone } from "lucide-react";

const Footer = () => (
  <footer className="border-t bg-muted/30 pt-12 pb-24 mt-auto">
    <div className="container">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Footprints className="h-5 w-5 text-primary" />
            <span className="font-bold text-foreground">풋케어 AI</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            AI 기반 평발 분석 서비스로 건강한 발을 유지하세요. 간편한 사진 촬영만으로 위험도를 확인할 수 있습니다.
          </p>
        </div>

        {/* Services */}
        <div>
          <h4 className="font-semibold text-sm mb-3 text-foreground">서비스</h4>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li><Link to="/analysis" className="hover:text-primary transition-colors">발 분석</Link></li>
            <li><Link to="/history" className="hover:text-primary transition-colors">내 기록</Link></li>
          </ul>
        </div>


        {/* Contact */}
        <div>
          <h4 className="font-semibold text-sm mb-3 text-foreground">Contact</h4>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-primary/60" />
              aiden@sasa.hs.kr
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-primary/60" />
              010-9852-1246
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-primary/60" />
              세종과학예술영재학교
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <p>© 2026 풋케어 AI. All rights reserved.</p>
        <p>본 서비스는 의료 진단을 대체하지 않습니다.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
