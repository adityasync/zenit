"use client";

import { useState, useCallback } from 'react';
import type { StockQuote, PaperTradeOrder } from '@/types/market';
import { getLotSize, fromLots } from '@/lib/fo-lots';

interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  lotSize?: number;
}

interface Alert {
  symbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  triggered: boolean;
}

interface WatchlistItem {
  symbol: string;
  name: string;
  ltp: number;
  change: number;
  percentChange: number;
  volume: number;
  timestamp: number;
}

export function usePaperTrading() {
  const [balance, setBalance] = useState(100000);
  const [positions, setPositions] = useState<Position[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PaperTradeOrder[]>([]);
  const [orderType, setOrderType] = useState<"market" | "limit" | "stop-loss" | "target">("market");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopLossPrice, setStopLossPrice] = useState("");
  const [useLots, setUseLots] = useState(false);
  const [tradeQty, setTradeQty] = useState("10");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertInput, setAlertInput] = useState({ symbol: '', price: '' });

  const executeTrade = useCallback((action: 'BUY' | 'SELL', stock: WatchlistItem) => {
    let qty: number;
    if (useLots) {
      const lots = parseInt(tradeQty);
      if (isNaN(lots) || lots <= 0) return;
      qty = fromLots(lots, stock.symbol);
    } else {
      qty = parseInt(tradeQty);
      if (isNaN(qty) || qty <= 0) return;
    }

    const orderPrice = orderType === "limit" && limitPrice ? parseFloat(limitPrice) : stock.ltp;
    const value = qty * orderPrice;

    if (orderType === "market" || orderType === "limit") {
      if (action === 'BUY' && balance < value) {
        alert("Insufficient Capital!");
        return;
      }

      setPositions(prev => {
        const existing = prev.find(p => p.symbol === stock.symbol);
        let newPositions = [...prev];
        if (action === 'BUY') {
          setBalance(b => b - value);
          if (existing) {
            const newAvg = ((existing.quantity * existing.avgPrice) + value) / (existing.quantity + qty);
            newPositions = newPositions.map(p => p.symbol === stock.symbol ? { ...p, quantity: p.quantity + qty, avgPrice: newAvg, lotSize: getLotSize(stock.symbol) } : p);
          } else {
            newPositions.push({ symbol: stock.symbol, quantity: qty, avgPrice: orderPrice, currentPrice: stock.ltp, lotSize: getLotSize(stock.symbol) });
          }
        } else {
          if (!existing || existing.quantity < qty) {
            alert("Insufficient shares to sell!");
            return prev;
          }
          setBalance(b => b + value);
          if (existing.quantity === qty) {
            newPositions = newPositions.filter(p => p.symbol !== stock.symbol);
          } else {
            newPositions = newPositions.map(p => p.symbol === stock.symbol ? { ...p, quantity: p.quantity - qty } : p);
          }
        }
        return newPositions;
      });
    }

    if ((orderType === "stop-loss" || orderType === "target") && stopLossPrice) {
      const triggerPrice = parseFloat(stopLossPrice);
      if (isNaN(triggerPrice) || triggerPrice <= 0) return;

      const newOrder: PaperTradeOrder = {
        id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        symbol: stock.symbol,
        type: action === 'BUY' ? 'buy' : 'sell',
        orderType: orderType,
        quantity: qty,
        price: orderType === "target" ? triggerPrice : undefined,
        triggerPrice: triggerPrice,
        status: "pending",
        lotSize: getLotSize(stock.symbol),
      };

      setPendingOrders(prev => [...prev, newOrder]);
      alert(`${orderType === "stop-loss" ? "Stop-loss" : "Target"} order placed at ₹${triggerPrice}`);
    }
  }, [tradeQty, balance, orderType, limitPrice, stopLossPrice, useLots]);

  const addAlert = useCallback((currentPrice: number = 0) => {
    if (!alertInput.symbol || !alertInput.price) return;
    const price = parseFloat(alertInput.price);
    if (isNaN(price) || price <= 0) return;
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setAlerts(prev => [...prev, {
      symbol: alertInput.symbol.toUpperCase(),
      targetPrice: price,
      condition: price >= currentPrice ? 'above' : 'below',
      triggered: false,
    }]);
    setAlertInput({ symbol: '', price: '' });
  }, [alertInput]);

  const cancelOrder = useCallback((orderId: string) => {
    setPendingOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "cancelled" as const } : o));
  }, []);

  const removeAlert = useCallback((index: number) => {
    setAlerts(prev => prev.filter((_, j) => j !== index));
  }, []);

  const handleTickerUpdate = useCallback((data: StockQuote) => {
    setPositions(prev => prev.map(p =>
      p.symbol === data.symbol ? { ...p, currentPrice: data.ltp } : p
    ));

    setPendingOrders(prevOrders => {
      const remaining: PaperTradeOrder[] = [];

      for (const order of prevOrders) {
        if (order.status !== "pending") {
          remaining.push(order);
          continue;
        }

        let shouldTrigger = false;
        if (order.orderType === "stop-loss" && order.triggerPrice) {
          if (order.type === "sell" && data.ltp <= order.triggerPrice) shouldTrigger = true;
          if (order.type === "buy" && data.ltp >= order.triggerPrice) shouldTrigger = true;
        }
        if (order.orderType === "target" && order.price) {
          if (order.type === "sell" && data.ltp >= order.price) shouldTrigger = true;
          if (order.type === "buy" && data.ltp <= order.price) shouldTrigger = true;
        }

        if (shouldTrigger) {
          const qty = order.quantity;
          const price = data.ltp;
          const value = qty * price;

          if (order.type === "buy") {
            setBalance(b => b - value);
            setPositions(prev => {
              const existing = prev.find(p => p.symbol === order.symbol);
              if (existing) {
                const newAvg = ((existing.quantity * existing.avgPrice) + value) / (existing.quantity + qty);
                return prev.map(p => p.symbol === order.symbol ? { ...p, quantity: p.quantity + qty, avgPrice: newAvg } : p);
              } else {
                return [...prev, { symbol: order.symbol, quantity: qty, avgPrice: price, currentPrice: price, lotSize: order.lotSize }];
              }
            });
          } else {
            setBalance(b => b + value);
            setPositions(prev => {
              const existing = prev.find(p => p.symbol === order.symbol);
              if (existing && existing.quantity === qty) {
                return prev.filter(p => p.symbol !== order.symbol);
              } else if (existing) {
                return prev.map(p => p.symbol === order.symbol ? { ...p, quantity: p.quantity - qty } : p);
              }
              return prev;
            });
          }

          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(`Order Executed: ${order.symbol}`, {
              body: `${order.type.toUpperCase()} ${qty} @ ₹${price.toFixed(2)}`,
            });
          }
        } else {
          remaining.push(order);
        }
      }

      return remaining;
    });

    setAlerts(prev => prev.map(alert => {
      if (alert.triggered || alert.symbol !== data.symbol) return alert;
      const hit = (alert.condition === 'above' && data.ltp >= alert.targetPrice) ||
                  (alert.condition === 'below' && data.ltp <= alert.targetPrice);
      if (hit) {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(`🔔 ZENIT Alert: ${alert.symbol}`, {
            body: `Price ${alert.condition === 'above' ? 'crossed above' : 'dropped below'} ₹${alert.targetPrice}. Current: ₹${data.ltp}`,
          });
        }
        return { ...alert, triggered: true };
      }
      return alert;
    }));
  }, []);

  return {
    balance, positions, pendingOrders,
    orderType, setOrderType,
    limitPrice, setLimitPrice,
    stopLossPrice, setStopLossPrice,
    useLots, setUseLots,
    tradeQty, setTradeQty,
    alerts, alertInput, setAlertInput,
    executeTrade, addAlert, cancelOrder, removeAlert, handleTickerUpdate,
  };
}
