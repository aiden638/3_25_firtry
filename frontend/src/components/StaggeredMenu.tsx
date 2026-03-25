import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

export interface StaggeredMenuItem {
  label: string;
  link: string;
  onClick?: () => void;
}

interface StaggeredMenuProps {
  items: StaggeredMenuItem[];
  colors?: string[];
  className?: string;
}

export default function StaggeredMenu({
  items,
  colors = ['hsl(160, 84%, 39%)', 'hsl(160, 72%, 30%)'],
  className = '',
}: StaggeredMenuProps) {
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      if (panelRef.current) {
        gsap.set(panelRef.current, { xPercent: 100 });
      }
    });
    return () => ctx.revert();
  }, []);

  const toggleMenu = useCallback(() => {
    const target = !openRef.current;
    openRef.current = target;
    setOpen(target);

    const panel = panelRef.current;
    if (!panel) return;

    if (target) {
      const itemEls = Array.from(panel.querySelectorAll('.sm-item')) as HTMLElement[];
      gsap.set(itemEls, { yPercent: 0, opacity: 1 });
      gsap.to(panel, {
        xPercent: 0,
        duration: 0.25,
        ease: 'power3.out',
      });
    } else {
      gsap.to(panel, {
        xPercent: 100,
        duration: 0.2,
        ease: 'power3.in',
      });
    }
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        openRef.current = false;
        setOpen(false);
        gsap.to(panelRef.current, { xPercent: 100, duration: 0.2, ease: 'power3.in' });
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggleMenu}
        className={`fixed top-5 right-5 z-[60] w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ${className}`}
        style={{
          background: open ? colors[1] : colors[0],
          color: '#fff',
        }}
        aria-label="메뉴 열기/닫기"
      >
        <div className="relative w-4 h-4 flex items-center justify-center">
          <span
            className="absolute w-4 h-0.5 bg-white transition-transform duration-200"
            style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg) translateY(-3px)' }}
          />
          <span
            className="absolute w-4 h-0.5 bg-white transition-transform duration-200"
            style={{ transform: open ? 'rotate(-45deg)' : 'rotate(0deg) translateY(3px)' }}
          />
        </div>
      </button>

      <div
        ref={panelRef}
        className="fixed top-0 right-0 z-[55] h-full w-72 flex flex-col justify-center px-8"
        style={{
          background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
        }}
      >
        <nav className="flex flex-col gap-1">
          {items.map((item, i) => (
            <a
              key={i}
              href={item.link}
              onClick={(e) => {
                if (item.onClick) {
                  e.preventDefault();
                  item.onClick();
                  openRef.current = false;
                  setOpen(false);
                  gsap.to(panelRef.current, { xPercent: 100, duration: 0.2, ease: 'power3.in' });
                }
              }}
              className="sm-item block text-white text-2xl font-bold py-2.5 hover:translate-x-2 transition-transform duration-150"
            >
              <span className="text-white/40 text-xs font-normal mr-2">0{i + 1}</span>
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </>
  );
}
