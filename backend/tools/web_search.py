import urllib.parse
import json

class WebSearchEngine:
    """Live web search engine extracting clean summaries and source links."""

    @staticmethod
    def search(query: str) -> dict:
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
                import urllib.request
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
