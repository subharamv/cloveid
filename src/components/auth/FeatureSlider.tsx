import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { Palette, LayoutDashboard, ImageIcon, Cloud, Sparkles, Layers, Repeat, Share2 } from 'lucide-react';
import idCardMockup from '../../assets/Hanging-ID-Card-Mockup-01.jpg';

const v2features = [
  { icon: Palette, title: 'New Sleek UI', desc: 'Modern, intuitive interface redesigned from ground up' },
  { icon: LayoutDashboard, title: 'Optimized Flow', desc: 'Streamlined card generation & management workflows' },
  { icon: ImageIcon, title: 'Photo Editor', desc: 'Brightness, contrast & crop controls for ID photos' },
  { icon: Cloud, title: 'Google Drive', desc: 'Direct cloud storage integration for card exports' },
];

const v3features = [
  { icon: Layers, title: 'Template Editing', desc: 'Customizable ID card templates' },
  { icon: Repeat, title: 'Multiple Templates', desc: 'Support for various card layouts' },
  { icon: Share2, title: 'Bulk Sharing', desc: 'One-click distribution to employees' },
  { icon: Sparkles, title: 'AI Enhancements', desc: 'Smart photo correction & layout suggestions' },
];

const totalSlides = 1 + v2features.length + 1;

export default function FeatureSlider() {
  const [current, setCurrent] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const goTo = useCallback((index: number) => {
    if (!trackRef.current || !containerRef.current) return;
    const w = containerRef.current.offsetWidth;
    gsap.to(trackRef.current, {
      x: -index * w,
      duration: 0.6,
      ease: 'power3.out',
    });
    setCurrent(index);
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      goTo((current + 1) % totalSlides);
    }, 3500);
    return () => clearInterval(timerRef.current);
  }, [current, goTo]);

  useEffect(() => {
    const onResize = () => {
      if (!trackRef.current || !containerRef.current) return;
      const w = containerRef.current.offsetWidth;
      gsap.set(trackRef.current, { x: -current * w });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [current]);

  return (
    <div className="rounded-xl bg-white dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-700/50 shadow-sm overflow-hidden">
      <div ref={containerRef} className="overflow-hidden">
        <div ref={trackRef} className="flex" style={{ width: `${totalSlides * 100}%` }}>
          {/* Slide 0: ID Card Mockup */}
          <div className="flex items-center justify-center p-5" style={{ width: `${100 / totalSlides}%` }}>
            <div
              className="w-full aspect-video bg-center bg-no-repeat bg-cover rounded-lg border border-gray-100 dark:border-zinc-700/50"
              style={{ backgroundImage: `url(${idCardMockup})` }}
            />
          </div>

          {/* Slides 1-4: v2.0 Features */}
          {v2features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={`v2-${i}`}
                className="flex flex-col items-center justify-center gap-3 p-6 text-center relative"
                style={{ width: `${100 / totalSlides}%` }}
              >
                <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-bold tracking-wider uppercase border border-primary/20">
                  <Sparkles size={8} />
                  v2.0
                </span>
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Icon size={28} className="text-primary" />
                </div>
                <div className="max-w-[250px]">
                  <p className="text-[#111418] dark:text-white text-base font-bold">{f.title}</p>
                  <p className="text-[#617289] dark:text-gray-400 text-sm leading-relaxed mt-1">{f.desc}</p>
                </div>
              </div>
            );
          })}

          {/* Slide 5: v3.0 Coming Next */}
          <div className="flex flex-col justify-center p-5" style={{ width: `${100 / totalSlides}%` }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-bold text-primary uppercase tracking-wider">Coming Next — v3.0</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {v3features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div key={i} className="flex items-start gap-2.5 rounded-lg bg-background-light dark:bg-zinc-800 p-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon size={15} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[#111418] dark:text-white text-xs font-bold truncate">{f.title}</p>
                      <p className="text-[#617289] dark:text-gray-400 text-[10px] leading-relaxed mt-0.5 line-clamp-2">{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 pb-4">
        {Array.from({ length: totalSlides }).map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              i === current ? 'bg-primary w-5' : 'bg-gray-300 dark:bg-zinc-600 hover:bg-gray-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
