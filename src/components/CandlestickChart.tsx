"use client";

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts';

interface ChartProps {
  data?: CandlestickData[];
  height?: number;
  colors?: {
    backgroundColor?: string;
    textColor?: string;
    gridColor?: string;
    upColor?: string;
    downColor?: string;
  };
}

export default function CandlestickChart({ 
  data, 
  height = 300,
  colors = {}
}: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const {
    backgroundColor = '#09090b',
    textColor = '#71717a',
    gridColor = '#27272a',
    upColor = '#22c55e',
    downColor = '#ef4444'
  } = colors;

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor,
        fontFamily: 'system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      width: containerRef.current.clientWidth,
      height,
      timeScale: {
        borderColor: gridColor,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: gridColor,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#52525b',
          labelBackgroundColor: '#27272a',
        },
        horzLine: {
          color: '#52525b',
          labelBackgroundColor: '#27272a',
        },
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor,
      downColor,
      borderDownColor: downColor,
      borderUpColor: upColor,
      wickDownColor: downColor,
      wickUpColor: upColor,
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [backgroundColor, textColor, gridColor, upColor, downColor, height]);

  useEffect(() => {
    if (seriesRef.current && data && data.length > 0) {
      seriesRef.current.setData(data);
      chartRef.current?.timeScale().fitContent();
    }
  }, [data]);

  return (
    <div 
      ref={containerRef} 
      className="w-full rounded-lg overflow-hidden"
      style={{ height }}
    />
  );
}