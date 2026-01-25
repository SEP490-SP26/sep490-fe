import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface GooeyNavItem {
  label: string;
  href: string;
}

export interface GooeyNavProps {
  items: GooeyNavItem[];
  animationTime?: number;
  particleCount?: number;
  particleDistances?: [number, number];
  particleR?: number;
  timeVariance?: number;
  colors?: number[];
}

const GooeyNav: React.FC<GooeyNavProps> = ({
  items,
  animationTime = 600,
  particleCount = 15,
  particleDistances = [90, 10],
  particleR = 100,
  timeVariance = 300,
  colors = [1, 2, 3, 1, 2, 3, 1, 4],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLUListElement>(null);
  const filterRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const pathname = usePathname();

  // Determine active index based on exact path match or if the current path starts with the item href (for sub-routes)
  // You might want strict equality depending on your routing needs.
  // Here strict equality is safer for things like '/' vs '/about'
  const activeIndex = items.findIndex(item => item.href === pathname);

  const noise = (n = 1) => n / 2 - Math.random() * n;

  const getXY = (distance: number, pointIndex: number, totalPoints: number): [number, number] => {
    const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
    return [distance * Math.cos(angle), distance * Math.sin(angle)];
  };

  const createParticle = (i: number, t: number, d: [number, number], r: number) => {
    let rotate = noise(r / 10);
    return {
      start: getXY(d[0], particleCount - i, particleCount),
      end: getXY(d[1] + noise(7), particleCount - i, particleCount),
      time: t,
      scale: 1 + noise(0.2),
      color: colors[Math.floor(Math.random() * colors.length)],
      rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10
    };
  };

  const makeParticles = (element: HTMLElement) => {
    const d: [number, number] = particleDistances;
    const r = particleR;
    const bubbleTime = animationTime * 2 + timeVariance;
    element.style.setProperty('--time', `${bubbleTime}ms`);
    for (let i = 0; i < particleCount; i++) {
      const t = animationTime * 2 + noise(timeVariance * 2);
      const p = createParticle(i, t, d, r);
      element.classList.remove('gn-active');
      setTimeout(() => {
        const particle = document.createElement('span');
        const point = document.createElement('span');
        particle.classList.add('gn-particle');
        particle.style.setProperty('--start-x', `${p.start[0]}px`);
        particle.style.setProperty('--start-y', `${p.start[1]}px`);
        particle.style.setProperty('--end-x', `${p.end[0]}px`);
        particle.style.setProperty('--end-y', `${p.end[1]}px`);
        particle.style.setProperty('--time', `${p.time}ms`);
        particle.style.setProperty('--scale', `${p.scale}`);
        particle.style.setProperty('--color', `var(--color-${p.color}, white)`);
        particle.style.setProperty('--rotate', `${p.rotate}deg`);
        point.classList.add('gn-point');
        particle.appendChild(point);
        element.appendChild(particle);
        requestAnimationFrame(() => {
          element.classList.add('gn-active');
        });
        setTimeout(() => {
          try {
            if (element.contains(particle)) {
              element.removeChild(particle);
            }
          } catch { }
        }, t);
      }, 30);
    }
  };

  const updateEffectPosition = (element: HTMLElement) => {
    if (!containerRef.current || !filterRef.current || !textRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const pos = element.getBoundingClientRect();
    const styles = {
      left: `${pos.x - containerRect.x}px`,
      top: `${pos.y - containerRect.y}px`,
      width: `${pos.width}px`,
      height: `${pos.height}px`
    };
    Object.assign(filterRef.current.style, styles);
    Object.assign(textRef.current.style, styles);
    textRef.current.innerText = element.innerText;
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, index: number) => {
    // No internal state update needed here, navigation will handle active state via pathname
    // But we still want the burst effect
    const liEl = e.currentTarget.closest('li');
    if (!liEl) return;

    // If already active, maybe don't trigger burst? Or do? Original code didn't trigger if active.
    if (activeIndex === index) return;

    if (filterRef.current) {
      // Clear old particles if any (though usually they are gone)
      // Note: original code removed all .particle, we should remove .gn-particle
      const particles = filterRef.current.querySelectorAll('.gn-particle');
      particles.forEach(p => filterRef.current!.removeChild(p));

      makeParticles(filterRef.current);
    }

    if (textRef.current) {
      textRef.current.classList.remove('gn-active');
      void textRef.current.offsetWidth; // Trigger reflow
      textRef.current.classList.add('gn-active');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLAnchorElement>, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      // Link handles navigation, this is mostly for the effect if we wanted to support keyboard triggering of effect manually
      // But Link onEnter defaults to click, so handleClick should fire.
      // We can leave this or simplify.
    }
  };

  useEffect(() => {
    if (!navRef.current || !containerRef.current) return;

    // If no active index (route not in valid items), hide the effect or reset?
    // The original logic assumes there is always an active item.
    // If activeIndex is -1, we might want to hide the blob.
    if (activeIndex === -1) {
      if (filterRef.current) filterRef.current.style.opacity = '0';
      if (textRef.current) textRef.current.style.opacity = '0';
      return;
    } else {
      if (filterRef.current) filterRef.current.style.opacity = '1';
      if (textRef.current) textRef.current.style.opacity = '1';
    }

    const activeLi = navRef.current.querySelectorAll('li')[activeIndex] as HTMLElement;
    if (activeLi) {
      updateEffectPosition(activeLi);
      textRef.current?.classList.add('gn-active');
    }

    const resizeObserver = new ResizeObserver(() => {
      const currentActiveLi = navRef.current?.querySelectorAll('li')[activeIndex] as HTMLElement;
      if (currentActiveLi) {
        updateEffectPosition(currentActiveLi);
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [activeIndex]);

  // Additional effect to handle route changes specifically if needed, 
  // but the dependency on activeIndex (which depends on pathname) covers it.

  return (
    <>
      <style>
        {`
          :root {
            --gn-linear-ease: linear(0, 0.068, 0.19 2.7%, 0.804 8.1%, 1.037, 1.199 13.2%, 1.245, 1.27 15.8%, 1.274, 1.272 17.4%, 1.249 19.1%, 0.996 28%, 0.949, 0.928 33.3%, 0.926, 0.933 36.8%, 1.001 45.6%, 1.013, 1.019 50.8%, 1.018 54.4%, 1 63.1%, 0.995 68%, 1.001 85%, 1);
            --color-1: var(--color-primary);
            --color-2: var(--color-primary);
          }
          .gn-effect {
            position: absolute;
            opacity: 1;
            pointer-events: none;
            display: grid;
            place-items: center;
            z-index: 1;
            transition: opacity 0.2s;
          }
          .gn-effect.gn-text {
            color: #1a1a1a;
            transition: color 0.3s ease, left 0.3s ease, top 0.3s ease, width 0.3s ease, height 0.3s ease;
          }
          .gn-effect.gn-text.gn-active {
            color: white;
            font-weight: 500;
          }
          .gn-effect.gn-filter {
            filter: blur(7px) contrast(100) blur(0);
            transition: left 0.3s ease, top 0.3s ease, width 0.3s ease, height 0.3s ease;
          }
          .gn-effect.gn-filter::after {
            content: "";
            position: absolute;
            inset: 0;
            background: var(--color-primary);
            transform: scale(0);
            opacity: 0;
            z-index: -1;
            border-radius: 9999px;
            box-shadow: 0 4px 12px rgba(21, 88, 196, 0.35);
          }
          .gn-effect.gn-active::after {
            animation: gn-pill 0.3s ease both;
          }
          @keyframes gn-pill {
            to {
              transform: scale(1);
              opacity: 1;
            }
          }
          .gn-particle,
          .gn-point {
            display: block;
            opacity: 0;
            width: 20px;
            height: 20px;
            border-radius: 9999px;
            transform-origin: center;
          }
          .gn-particle {
            --time: 5s;
            position: absolute;
            top: calc(50% - 8px);
            left: calc(50% - 8px);
            animation: gn-particle calc(var(--time)) ease 1 -350ms;
          }
          .gn-point {
            background: var(--color);
            opacity: 1;
            animation: gn-point calc(var(--time)) ease 1 -350ms;
          }
          @keyframes gn-particle {
            0% {
              transform: rotate(0deg) translate(calc(var(--start-x)), calc(var(--start-y)));
              opacity: 1;
              animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45);
            }
            70% {
              transform: rotate(calc(var(--rotate) * 0.5)) translate(calc(var(--end-x) * 1.2), calc(var(--end-y) * 1.2));
              opacity: 1;
              animation-timing-function: ease;
            }
            85% {
              transform: rotate(calc(var(--rotate) * 0.66)) translate(calc(var(--end-x)), calc(var(--end-y)));
              opacity: 1;
            }
            100% {
              transform: rotate(calc(var(--rotate) * 1.2)) translate(calc(var(--end-x) * 0.5), calc(var(--end-y) * 0.5));
              opacity: 1;
            }
          }
          @keyframes gn-point {
            0% {
              transform: scale(0);
              opacity: 0;
              animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45);
            }
            25% {
              transform: scale(calc(var(--scale) * 0.25));
            }
            38% {
              opacity: 1;
            }
            65% {
              transform: scale(var(--scale));
              opacity: 1;
              animation-timing-function: ease;
            }
            85% {
              transform: scale(var(--scale));
              opacity: 1;
            }
            100% {
              transform: scale(0);
              opacity: 0;
            }
          }
          li.gn-active {
            color: white;
            text-shadow: none;
          }
          li.gn-active::after {
            opacity: 1;
            transform: scale(1);
          }
          li::after {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: 8px;
            background: var(--color-primary);
            opacity: 0;
            transform: scale(0);
            transition: all 0.3s ease;
            z-index: -1;
          }
        `}
      </style>
      <div className="relative" ref={containerRef}>
        <nav className="flex relative" style={{ transform: 'translate3d(0,0,0.01px)' }}>
          <ul
            ref={navRef}
            className="flex gap-8 list-none p-0 px-4 m-0 relative z-[3]"
            style={{
              color: '#333',
            }}
          >
            {items.map((item, index) => (
              <li
                key={index}
                className={`rounded-full relative cursor-pointer transition-[background-color_color_box-shadow] duration-300 ease text-[#333] ${activeIndex === index ? 'gn-active' : ''
                  }`}
              >
                <Link
                  href={item.href}
                  onClick={e => handleClick(e as any, index)}
                  className="outline-none py-[0.6em] px-[1em] inline-block w-full h-full"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <span className="gn-effect gn-filter" ref={filterRef} />
        <span className="gn-effect gn-text" ref={textRef} />
      </div>
    </>
  );
};

export default GooeyNav;
