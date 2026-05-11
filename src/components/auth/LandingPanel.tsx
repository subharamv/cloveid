import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Sparkles, Heart } from 'lucide-react';
import cloveLogo from '../../assets/CLOVE LOGO BLACK.png';
import FeatureSlider from './FeatureSlider';

export default function LandingPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(
        '.landing-logo',
        { opacity: 0, y: -30, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6 }
      ).fromTo(
        '.landing-badge',
        { opacity: 0, scale: 0.5, rotation: -10 },
        { opacity: 1, scale: 1, rotation: 0, duration: 0.4 },
        '-=0.3'
      ).fromTo(
        titleRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.7 },
        '-=0.2'
      ).fromTo(
        subtitleRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5 },
        '-=0.3'
      ).fromTo(
        '.slider-section',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6 },
        '-=0.1'
      ).fromTo(
        '.landing-footer',
        { opacity: 0 },
        { opacity: 1, duration: 0.4 },
        '-=0.2'
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col justify-center bg-background-light dark:bg-background-dark p-6 md:p-10 overflow-hidden">
      <div className="flex w-full max-w-lg flex-col gap-5 mx-auto">

        {/* Logo + v2.0 Badge */}
        <div className="flex items-center gap-4 landing-logo">
          <img src={cloveLogo} alt="Clove Logo" className="h-9 object-contain" />
          <span className="landing-badge inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase border border-primary/20">
            <Sparkles size={12} />
            v2.0
          </span>
        </div>

        {/* Hero Title */}
        <div className="flex flex-col gap-2">
          <h1
            ref={titleRef}
            className="text-[#111418] dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]"
          >
            The Next Generation{' '}
            <span className="text-primary">ID Platform</span>
          </h1>
          <p
            ref={subtitleRef}
            className="text-[#617289] dark:text-gray-400 text-base font-normal leading-relaxed"
          >
            Experience the completely redesigned Clove ID system — faster, smarter, and more intuitive than ever.
          </p>
        </div>

        {/* Smooth Scroll Slider — v2.0 features + mockup + v3.0 coming next */}
        <div className="slider-section">
          <FeatureSlider />
        </div>

        {/* Footer */}
        <div className="landing-footer text-center">
          <p className="text-xs text-[#617289]/40 dark:text-gray-500/40 flex items-center justify-center gap-1">
            Made with <Heart size={12} className="text-red-400 inline fill-red-400" />
          </p>
        </div>
      </div>
    </div>
  );
}
