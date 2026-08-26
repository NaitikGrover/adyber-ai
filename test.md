# 🧪 Ady AI Assistant - Master Test Suite & Feature Verification

This document contains a comprehensive, multi-category test plan to rigorously evaluate **Ady AI Assistant** across all features, edge cases, autonomous learning, and conversational intelligence.

---

## 📋 Table of Contents
1. [Core OS Applications (Known Apps)](#1-core-os-applications-known-apps)
2. [Chrome / Edge PWA Shortcuts](#2-chrome--edge-pwa-shortcuts)
3. [Pre-Indexed Web Platforms](#3-pre-indexed-web-platforms)
4. [Autonomous Web Discovery & Memory Learning](#4-autonomous-web-discovery--memory-learning)
5. [Media & Music Playback (YouTube vs YouTube Music vs Spotify)](#5-media--music-playback)
6. [Conversational Multi-Turn Context & Follow-Ups](#6-conversational-multi-turn-context--follow-ups)
7. [Live Web Search with Clickable Sources](#7-live-web-search-with-clickable-sources)
8. [Persistent Long-Term Memory (Facts & Preferences)](#8-persistent-long-term-memory)
9. [Verification Checklist & Results Table](#9-verification-checklist)

---

## 1. Core OS Applications (Known Apps)
> **Goal**: Verify that local desktop applications launch immediately via Windows shortcuts, executables, or URI handlers.

| Test ID | Voice / Text Prompt | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- |
| **APP-01** | *"Open Google Chrome"* | Launches Chrome browser window | ⬜ |
| **APP-02** | *"Open Discord"* | Launches Discord desktop app (restoring from tray/background) | ⬜ |
| **APP-03** | *"Open Visual Studio Code"* or *"Open VS Code"* | Launches VS Code editor | ⬜ |
| **APP-04** | *"Open Notepad"* | Opens Notepad text editor | ⬜ |
| **APP-05** | *"Open Calculator"* | Launches Windows Calculator | ⬜ |
| **APP-06** | *"Open File Explorer"* or *"Open Downloads"* | Opens File Explorer at target location | ⬜ |
| **APP-07** | *"Open Terminal"* or *"Open PowerShell"* | Launches Windows Terminal | ⬜ |
| **APP-08** | *"Open Microsoft Word"* / *"Open Excel"* | Launches MS Office application | ⬜ |

---

## 2. Chrome / Edge PWA Shortcuts
> **Goal**: Ensure Chrome/Edge installed web apps (PWAs) launch as dedicated window shortcuts rather than regular browser tabs.

| Test ID | Voice / Text Prompt | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- |
| **PWA-01** | *"Open YouTube Music"* | Launches `YouTube Music.lnk` Chrome App shortcut directly | ⬜ |

---

## 3. Pre-Indexed Web Platforms
> **Goal**: Ensure major web platforms open directly in the default browser.

| Test ID | Voice / Text Prompt | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- |
| **WEB-01** | *"Open YouTube"* | Opens `https://www.youtube.com` | ⬜ |
| **WEB-02** | *"Open GitHub"* | Opens `https://github.com` | ⬜ |
| **WEB-03** | *"Open Kick"* or *"Open Kick website"* | Opens `https://kick.com` | ⬜ |
| **WEB-04** | *"Open Reddit"* | Opens `https://reddit.com` | ⬜ |
| **WEB-05** | *"Open ChatGPT"* | Opens `https://chatgpt.com` | ⬜ |
| **WEB-06** | *"Open Netflix"* | Opens `https://netflix.com` | ⬜ |

---

## 4. Autonomous Web Discovery & Memory Learning
> **Goal**: If an app or service is **NOT** installed locally and **NOT** in known dictionaries, Ady must automatically search the web for its official domain, open it in the browser, and remember the URL in long-term memory for instant future recall.

| Test ID | Voice / Text Prompt | Step-by-Step Expected Flow | Pass/Fail |
| :--- | :--- | :--- | :--- |
| **AUT-01** | *"Open Monkeytype"* | **Turn 1**: Scans PC (not found) $\rightarrow$ Searches DuckDuckGo $\rightarrow$ Discovers `https://monkeytype.com` $\rightarrow$ Saves to Memory $\rightarrow$ Opens in browser.<br>**Turn 2**: *"Open Monkeytype"* $\rightarrow$ Opens instantly from learned memory without searching! | ⬜ |
| **AUT-02** | *"Open Linear"* | Discovers `https://linear.app` $\rightarrow$ Saves to Memory $\rightarrow$ Opens in browser. | ⬜ |
| **AUT-03** | *"Open Figma"* | Discovers `https://figma.com` $\rightarrow$ Opens in browser. | ⬜ |
| **AUT-04** | *"Open Claude"* | Discovers `https://claude.ai` $\rightarrow$ Opens in browser. | ⬜ |

---

## 5. Media & Music Playback
> **Goal**: Differentiate cleanly between standard YouTube, YouTube Music, and Spotify, opening direct search/watch pages for songs.

| Test ID | Voice / Text Prompt | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- |
| **MED-01** | *"Play God's Plan"* | Opens `https://www.youtube.com/results?search_query=god%27s+plan` with the song at the top | ⬜ |
| **MED-02** | *"Play Starboy on YouTube Music"* | Opens `https://music.youtube.com/search?q=starboy` | ⬜ |
| **MED-03** | *"Play Jakhira on Spotify"* | Triggers `spotify:search:jakhira` or opens Spotify search | ⬜ |
| **MED-04** | *"Open YouTube"* vs *"Open YouTube Music"* | `Open YouTube` $\rightarrow$ `youtube.com`<br>`Open YouTube Music` $\rightarrow$ `YouTube Music.lnk` / `music.youtube.com` | ⬜ |

---

## 6. Conversational Multi-Turn Context & Follow-Ups
> **Goal**: Verify that Ady remembers recent dialogue turns and seamlessly resolves follow-up answers, pronouns, and chained requests.

| Test ID | Dialogue Flow | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- |
| **CTX-01** | **User**: *"Open"*<br>**Ady**: *"What app or website would you like me to open?"*<br>**User**: *"YouTube"* | Ady understands the follow-up answer and immediately launches YouTube! | ⬜ |
| **CTX-02** | **User**: *"Who is Elon Musk?"*<br>**Ady**: *[Explains Elon Musk]*<br>**User**: *"What is his net worth?"* | Ady understands "his" refers to Elon Musk and fetches his net worth. | ⬜ |
| **CTX-03** | **User**: *"What's the weather in Tokyo today?"*<br>**Ady**: *[Gives Tokyo weather]*<br>**User**: *"What about tomorrow?"* | Ady understands "tomorrow" refers to Tokyo's forecast. | ⬜ |

---

## 7. Live Web Search with Clickable Sources
> **Goal**: Verify real-time information retrieval with source links and citations.

| Test ID | Voice / Text Prompt | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- |
| **SRC-01** | *"What are the latest tech news and AI updates today?"* | Live DuckDuckGo search + plain spoken summary + clickable source cards | ⬜ |
| **SRC-02** | *"What is the stock price of Apple right now?"* | Fetches live market info with sources | ⬜ |
| **SRC-03** | *"Who won the latest football match yesterday?"* | Fetches live sports results with citations | ⬜ |

---

## 8. Persistent Long-Term Memory
> **Goal**: Verify user facts, name, and learned preferences persist across restarts.

| Test ID | Voice / Text Prompt | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- |
| **MEM-01** | *"Remember that my favorite programming language is Python"* | Saves fact: `Favorite programming language: Python` in memory | ⬜ |
| **MEM-02** | *"What is my favorite programming language?"* | Recalls *"Your favorite programming language is Python"* | ⬜ |
| **MEM-03** | *"What is my name?"* | Answers with the user's name (e.g. *"Naitik"*) | ⬜ |

---

## 9. Verification Checklist

- [ ] All 8 Core OS Apps launch properly
- [ ] Chrome PWA (`YouTube Music.lnk`) launches as standalone app
- [ ] YouTube (`youtube.com`) and YouTube Music (`music.youtube.com`) are differentiated
- [ ] Playing a song ("God's Plan") opens the search/watch results page directly
- [ ] Autonomous web discovery finds unknown sites (Monkeytype) and learns them
- [ ] Multi-turn follow-up ("Open" $\rightarrow$ "YouTube") works seamlessly
- [ ] Live web search provides spoken answer and source links
- [ ] Long-term memory facts are remembered across app restarts
