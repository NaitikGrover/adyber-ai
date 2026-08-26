import urllib.parse
import urllib.request
import json
import re

class WebSearchEngine:
    """Live web search engine with Real-Time Stock & Crypto quotes and DuckDuckGo live search."""

    FINANCIAL_TICKERS = {
        "apple": "AAPL", "aapl": "AAPL",
        "tesla": "TSLA", "tsla": "TSLA",
        "nvidia": "NVDA", "nvda": "NVDA",
        "microsoft": "MSFT", "msft": "MSFT",
        "amazon": "AMZN", "amzn": "AMZN",
        "google": "GOOGL", "googl": "GOOGL", "alphabet": "GOOGL",
        "meta": "META", "facebook": "META",
        "netflix": "NFLX",
        "amd": "AMD", "intel": "INTC",
        "bitcoin": "BTC-USD", "btc": "BTC-USD",
        "ethereum": "ETH-USD", "eth": "ETH-USD",
        "solana": "SOL-USD", "sol": "SOL-USD",
        "dogecoin": "DOGE-USD", "doge": "DOGE-USD",
        "sp500": "^GSPC", "s&p 500": "^GSPC", "s&p": "^GSPC",
        "nasdaq": "^IXIC"
    }

    @staticmethod
    def _fetch_live_finance(query: str) -> dict:
        """Fetches live stock and cryptocurrency market prices directly from Yahoo Finance."""
        q_lower = query.lower()
        if any(kw in q_lower for kw in ["stock", "share", "price", "market cap", "worth", "crypto", "coin", "trading at", "quote", "cost", "value"]):
            for name, ticker in WebSearchEngine.FINANCIAL_TICKERS.items():
                if re.search(r'\b' + re.escape(name) + r'\b', q_lower):
                    try:
                        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
                        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
                        with urllib.request.urlopen(req, timeout=4) as resp:
                            data = json.loads(resp.read().decode('utf-8'))
                            meta = data['chart']['result'][0]['meta']
                            price = meta.get('regularMarketPrice')
                            curr = meta.get('currency', 'USD')
                            sym = meta.get('symbol', ticker)
                            prev = meta.get('chartPreviousClose') or meta.get('previousClose')
                            
                            if price is not None:
                                change_pct = ((price - prev) / prev * 100) if prev and price else 0
                                display_price = f"${price:,.2f}" if curr == "USD" else f"{price:,.2f} {curr}"
                                summary = f"[LIVE FINANCIAL MARKET QUOTE]: {name.capitalize()} ({sym}) is currently trading live at {display_price} {curr} ({change_pct:+.2f}% today)."
                                sources = [{
                                    "title": f"{sym} Live Stock Quote - Yahoo Finance",
                                    "url": f"https://finance.yahoo.com/quote/{ticker}",
                                    "snippet": f"Real-time financial market price for {sym}: {display_price} {curr}"
                                }]
                                print(f"[WebSearchEngine] Fetched live finance data for {sym}: {display_price}")
                                return {"summary": summary, "sources": sources}
                    except Exception as e:
                        print(f"[WebSearchEngine Finance Error]: {e}")
        return None

    @staticmethod
    def search(query: str) -> dict:
        # Check for instant live stock / crypto quotes first
        finance_result = WebSearchEngine._fetch_live_finance(query)
        if finance_result:
            return finance_result

        sources = []
        summary = ""
        
        try:
            import requests
            from bs4 import BeautifulSoup
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
            }
            
            # Scrape live DuckDuckGo Lite HTML results
            res = requests.post(
                'https://lite.duckduckgo.com/lite/', 
                data={'q': query}, 
                headers=headers,
                timeout=8
            )
            
            if res.status_code == 200:
                soup = BeautifulSoup(res.text, 'html.parser')
                results = soup.find_all('td', class_='result-snippet')
                titles = soup.find_all('a', class_='result-link')
                
                extracted_text = []
                for idx, (snippet, title_tag) in enumerate(zip(results[:5], titles[:5])):
                    url = title_tag.get('href', '')
                    text = snippet.text.strip()
                    
                    extracted_text.append(f"[{idx+1}] {text}")
                    
                    sources.append({
                        "title": title_tag.text.strip()[:30] + "...",
                        "url": url,
                        "snippet": text[:100] + "..."
                    })
                
                if extracted_text:
                    summary = " ".join(extracted_text)
                    
        except Exception as e:
            print(f"[WebSearchEngine Error] {e}")

        # Wikipedia API Fallback
        if not summary or not sources:
            try:
                wiki_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(query)}"
                req = urllib.request.Request(wiki_url, headers={'User-Agent': 'Ady-Assistant/1.0'})
                with urllib.request.urlopen(req, timeout=5) as resp:
                    if resp.status == 200:
                        data = json.loads(resp.read().decode('utf-8'))
                        extract = data.get("extract", "")
                        page_url = data.get("content_urls", {}).get("desktop", {}).get("page", "")
                        title = data.get("title", "Wikipedia")

                        if extract:
                            summary = f"Wikipedia: {extract[:320]}"
                            sources.append({
                                "title": f"Wikipedia - {title}",
                                "url": page_url or f"https://en.wikipedia.org/wiki/{urllib.parse.quote(query)}",
                                "snippet": extract[:100] + "..."
                            })
            except Exception:
                pass

        if not summary:
            summary = f"I searched the web for '{query}'. Here are live topics and references."
            sources.append({
                "title": "Google Search",
                "url": f"https://www.google.com/search?q={urllib.parse.quote(query)}",
                "snippet": f"Search results for {query}"
            })

        return {"summary": summary[:2000], "sources": sources}
