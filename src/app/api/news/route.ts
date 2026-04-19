import { NextResponse } from "next/server";

const NEWS_SOURCES = [
  { name: "ET Markets", url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms" },
  { name: "Investing", url: "https://in.investing.com/rss/news.rss" },
  { name: "Zerodha Pulse", url: "https://pulse.zerodha.com/" },
];

const FINANCE_KEYWORDS = [
  'stock', 'market', 'nifty', 'sensex', 'bse', 'nse', 'share', 'rupee', 'rupees',
  ' IPO ', 'FII', 'DII', 'SEBI', 'NSE', 'BSE', 'mutual fund', 'MF ', 'equity',
  'bonus', 'dividend', 'split', 'buyback', 'profit', 'loss', 'revenue', 'quarterly',
  'result', 'earnings', 'sales', 'broker', 'trading', 'investor', 'portfolio',
  'bank', 'finance', 'insurance', 'loan', 'credit', 'digital', 'gold', 'silver',
  'commodity', 'oil', 'crude', 'currency', 'forex', 'usd', 'dollar', 'inflation',
  ' SBI ', 'HDFC', 'ICICI', 'Axis', 'Kotak', 'Reliance', 'TCS', 'Infosys', 'Wipro',
  'Tata', 'Adani', 'Ambani', 'Bajaj', 'Maruti', 'Titan', 'ONGC', 'Coal',
  'IT ', 'IT sector', 'pharma', 'steel', 'auto', 'metal', 'power', 'gas'
];

function parseRSS(xml: string, sourceName: string): any[] {
  const items: any[] = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null && items.length < 8) {
    const itemXml = match[1];
    const getVal = (tag: string) => {
      const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
      const m = itemXml.match(re);
      return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
    };
    
    const title = getVal('title');
    const link = getVal('link');
    const pubDate = getVal('pubDate');
    
    if (title && title.length > 10) {
      let timestamp = Date.now();
      try {
        const d = new Date(pubDate);
        if (!isNaN(d.getTime())) timestamp = d.getTime();
      } catch (e) { /* ignore */ }
      items.push({ id: link || crypto.randomUUID(), title, link, source: sourceName, pubDate, timestamp });
    }
  }
  return items;
}

async function fetchPulse(): Promise<any[]> {
  try {
    const res = await fetch('https://pulse.zerodha.com/', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return [];
    
    const html = await res.text();
    const items: any[] = [];
    
    const newsRegex = /<h2[^>]*>([^<]+)<\/h2>\s*<p[^>]*>([^\n]+)<\/p>\s*([\d.]+)\s*(hours|minutes|hour|min)\s*ago/gi;
    let match;
    
    while ((match = newsRegex.exec(html)) !== null && items.length < 15) {
      const title = match[1].replace(/&#039;/g, "'").replace(/&amp;/g, '&').trim();
      const desc = match[2].replace(/&#039;/g, "'").replace(/&amp;/g, '&').trim();
      const timeNum = parseFloat(match[3]);
      const timeUnit = match[4].toLowerCase();
      
      if (title && title.length > 10) {
        let timestamp = Date.now();
        if (timeUnit.startsWith('hour')) timestamp -= timeNum * 3600000;
        else timestamp -= timeNum * 60000;
        
        items.push({ 
          id: crypto.randomUUID(), 
          title, 
          link: '', 
          source: 'Pulse', 
          pubDate: `${timeNum} ${timeUnit} ago`, 
          timestamp 
        });
      }
    }
    return items;
  } catch (err) {
    return [];
  }
}

async function fetchAllNews() {
  const allNews: any[] = [];
  
  for (const src of NEWS_SOURCES) {
    if (src.name === 'Zerodha Pulse') continue;
    try {
      const res = await fetch(src.url, { 
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0)' },
        signal: AbortSignal.timeout(5000) 
      });
      if (res.ok) {
        const xml = await res.text();
        const items = parseRSS(xml, src.name);
        allNews.push(...items);
      }
    } catch (e) { console.log('Failed:', src.name); }
  }
  
  const pulseNews = await fetchPulse();
  allNews.push(...pulseNews);
  
  const sorted = allNews.sort((a, b) => b.timestamp - a.timestamp);
  
  const unique = sorted.filter((item, index, self) => 
    index === self.findIndex((t) => t.title === item.title)
  );
  
  return unique;
}

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  
  try {
    const news = await fetchAllNews();
    const filtered = symbol ? news.filter(n => new RegExp(`\\b${symbol}\\b`, 'i').test(n.title)) : news;
    return NextResponse.json(filtered.slice(0, 25), {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' }
    });
  } catch (e) {
    console.error('News error:', e);
    return NextResponse.json([]);
  }
}