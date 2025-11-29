"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useTransition, a } from "@react-spring/web";

interface MasonryItem {
  id: string | number;
  height: number;
  image: string;
  label?: string;
}

interface GridItem extends MasonryItem {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MasonryProps {
  data: MasonryItem[];
}

function Masonry({ data }: MasonryProps) {
  const [columns, setColumns] = useState<number>(2);

  useEffect(() => {
    const updateColumns = () => {
      if (window.matchMedia("(min-width: 1500px)").matches) {
        setColumns(5);
      } else if (window.matchMedia("(min-width: 1000px)").matches) {
        setColumns(2);
      } else if (window.matchMedia("(min-width: 600px)").matches) {
        setColumns(2);
      } else {
        setColumns(1);
      }
    };

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(0);

  useEffect(() => {
    const handleResize = () => {
      if (ref.current) {
        setWidth(ref.current.offsetWidth);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fixedHeight =
    typeof window !== "undefined" && window.innerWidth < 600 ? 100 : 250;
  const [heights, gridItems] = useMemo<[number[], GridItem[]]>(() => {
    const heights = new Array(columns).fill(0);
    const gridItems = data.map((child) => {
      const column = heights.indexOf(Math.min(...heights));
      const x = (width / columns) * column;
      const y = (heights[column] += fixedHeight) - fixedHeight;
      return {
        ...child,
        x,
        y,
        width: width / columns,
        height: fixedHeight,
      };
    });
    return [heights, gridItems];
  }, [columns, data, fixedHeight, width]);

  const transitions = useTransition<
    GridItem,
    { x: number; y: number; width: number; height: number; opacity: number }
  >(gridItems, {
    keys: (item) => item.id,
    from: ({ x, y, width, height }) => ({ x, y, width, height, opacity: 0 }),
    enter: ({ x, y, width, height }) => ({ x, y, width, height, opacity: 1 }),
    update: ({ x, y, width, height }) => ({ x, y, width, height }),
    leave: { height: 0, opacity: 0 },
    config: { mass: 5, tension: 500, friction: 100 },
    trail: 25,
  });

  return (
    <div
      ref={ref}
      className="relative w-full h-full"
      style={{ height: Math.max(...heights) }}
    >
      {transitions((style, item) => (
        <a.div
          key={item.id}
          style={style}
          className="absolute p-[15px] [will-change:transform,width,height,opacity]"
        >
          <div className="relative w-full h-full overflow-hidden rounded-md shadow-md transition duration-300 ease hover:scale-105">
            <img
              src={item.image}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white text-center text-xl font-semibold bg-black/50 px-2 py-1 rounded">
                {item.label || ""}
              </span>
            </div>
          </div>
        </a.div>
      ))}
    </div>
  );
}

export default Masonry;
