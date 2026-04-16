"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, CrosshairMode } from "lightweight-charts";

interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  showArea?: boolean;
}

export function Sparkline({
  data,
  color = "#22c55e",
  width = 100,
  height = 32,
  showArea = true,
}: SparklineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const chart = createChart(containerRef.current, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "transparent",
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      rightPriceScale: { visible: false },
      timeScale: { visible: false },
      handleScroll: false,
      handleScale: false,
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { visible: false },
        horzLine: { visible: false },
      },
    });

    chartRef.current = chart;

    const chartData = data.map((value, index) => ({
      time: index as unknown as import("lightweight-charts").Time,
      value,
    }));

    if (showArea) {
      const areaSeries = chart.addAreaSeries({
        lineColor: color,
        topColor: `${color}40`,
        bottomColor: `${color}00`,
        lineWidth: 2,
        priceScaleId: "right",
      });
      areaSeries.setData(chartData);
    } else {
      const lineSeries = chart.addLineSeries({
        color,
        lineWidth: 2,
        priceScaleId: "right",
      });
      lineSeries.setData(chartData);
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [data, color, width, height, showArea]);

  return (
    <div
      ref={containerRef}
      className="overflow-hidden"
      style={{ width, height }}
    />
  );
}
