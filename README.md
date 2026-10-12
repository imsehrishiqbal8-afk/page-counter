# 🌐 Website Page Counter Tool

A complete, production-grade, browser-based SEO tool that analyzes any website URL to discover and count its pages. It combines **intelligent XML sitemap parsing** (including nested sitemap indexes) and a **recursive internal link crawler** with real-time Server-Sent Events (SSE) progress streaming, robust SSRF protection, interactive search/filtering, and CSV export.

---

## 📑 Table of Contents
1. [Features](#-features)
2. [Why Sitemap Counts & Crawler Counts Differ](#-why-sitemap-counts--crawler-counts-differ)
3. [Architecture & Security (SSRF Protection)](#-architecture--security-ssrf-protection)
4. [Prerequisites](#-prerequisites)
5. [Quick Start (Simple English Guide)](#-quick-start-simple-english-guide)
6. [Automated Testing](#-automated-testing)
7. [API Endpoints](#-api-endpoints)
8. [Project Structure](#-project-structure)

---

## ✨ Features

- **Flexible Website URL Input:**
  - Enter URLs with or without `https://` (e.g. `example.com` or `https://example.com`).
  - Strict URL validation before initiating scans.
  - One-click sample test domains.

- **Intelligent Sitemap Discovery & Parsing:**
  - Automatically discovers sitemaps from `/robots.txt` `Sitemap:` directives.
  - Automatically probes standard paths: `/sitemap.xml`, `/sitemap_index.xml`, and `/wp-sitemap.xml`.
  - Supports nested sitemap index files (`<sitemapindex>`) containing multiple child sitemaps.
  - Seamlessly handles XML namespaces (`xmlns`), non-standard tags, malformed XML, and redirects.
  - Deduplicates URLs automatically.

- **Polite & Safe Website Link Crawler:**
  - Initiates breadth-first crawl starting from the homepage.
  - Extracts `<a href="...">` anchor links, resolves relative paths, and normalizes URLs.
  - Strips hash anchors (`#section`) and tracking parameters (`utm_*`, `fbclid`).
  - Filters out external domains, JavaScript pseudo-URLs (`javascript:`), email (`mailto:`), telephone links (`tel:`), and binary assets (`.pdf`, `.png`, `.jpg`, `.zip`, etc.).
  - Bypasses destructive or session-altering URLs (e.g. `/logout`, `/cart`, `/checkout`).
  - Complies with `robots.txt` `Disallow` rules.
  - Configurable maximum page limits (25, 50, 100, 250, 500, 1000) and crawl depths (1 to 6 hops).
  - Loop detection prevents re-visiting URLs.

- **Real-Time Progress & Dashboard:**
  - Real-time updates streamed directly via Server-Sent Events (SSE).
  - Live HTTP status code breakdown: `200 OK`, `3xx Redirects`, `4xx Client Errors`, `5xx Server Errors`.
  - Distinguishes Sitemap URLs, Crawled Internal Links, and Pages found in Both.
  - Quick action buttons: **Copy Page Count**, **Download TXT URL List**, and **Export CSV**.
  - Interactive URL results table with live search, column sorting, status filters, and pagination.
  - Terminal-style live discovery log drawer.
  - On-demand **Stop Scan** and **Clear Results** controls.

---

## 🔍 Why Sitemap Counts & Crawler Counts Differ

It is completely normal for a website's **Sitemap Count** and **Crawler Count** to yield different numbers:

| Characteristic | 🗺️ Sitemap Count | 🕷️ Crawler Count |
| :--- | :--- | :--- |
| **Source** | Declared in XML files by the webmaster. | Extracted from `<a href>` hyperlinks on HTML pages. |
| **Orphan Pages** | Discovers orphan pages (pages not linked in site menus/content). | Cannot discover orphan pages unless linked somewhere. |
| **Hidden / Unlinked** | Shows pages created in CMS even if unlinked. | Only visits accessible, connected pages. |
| **Noindex Pages** | May inadvertently contain `noindex` pages. | Will follow links regardless unless blocked in `robots.txt`. |
| **Dynamic Parameters** | Usually lists canonical URLs only. | May discover multiple faceted search or parameter URLs. |

> **⚠️ Important SEO Note:** Discovered URLs do **not** claim to represent every page indexed by Google. Google uses proprietary algorithms, content quality thresholds, canonical signals, rendering, and crawl budgets to decide which pages appear in its search index.

---

## 🛡️ Architecture & Security (SSRF Protection)

Because this tool fetches arbitrary user-supplied URLs, it includes strict server-side safeguards to prevent **Server-Side Request Forgery (SSRF)**:

1. **Protocol Restriction:** Only `http:` and `https:` schemes are permitted. Schemes like `file:`, `gopher:`, `ftp:`, `data:` are blocked.
2. **IP Blacklisting:** Rejects localhost, loopback (`127.0.0.0/8`, `::1`), RFC 1918 private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local (`169.254.0.0/16`, `fe80::/10`), unique local (`fc00::/7`), and carrier-grade NAT (`100.64.0.0/10`).
3. **Cloud Metadata Protection:** Explicitly blocks AWS, GCP, and Azure metadata IPs (`169.254.169.254`, `metadata.google.internal`).
4. **Safe DNS Pre-Resolution:** Resolves hostnames via DNS and validates *all* resolved IP addresses before any connection is initiated.
5. **Secure Redirect Interception:** Follows HTTP redirects manually (`redirect: 'manual'`) and validates each redirect target URL against the SSRF guard before requesting it.
6. **Resource Limits:**
   - 8-second request timeouts.
   - 2 MB response size ceiling (prevents memory exhaustion or decompression bombs).
   - Strict Origin lock: Crawler never leaves the target domain.
   - No JavaScript execution (uses lightweight HTML parsing via Cheerio).

---

## 💻 Prerequisites

- **Node.js** (v18, v20 LTS, or v22 LTS recommended)
- **npm** (bundled with Node.js)

---

## 🚀 Quick Start (Simple English Guide)

Follow these simple steps in your terminal or PowerShell window:

### Step 1: Open the Project Directory
```bash
cd "C:\Users\Hi\.gemini\antigravity\scratch\page-counter"
```

### Step 2: Install Dependencies
Install dependencies for both backend and frontend:
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install

# Return to root directory
cd ..
```

### Step 3: Run the Application
You can run the development servers concurrently in two separate terminal windows:

**Terminal 1 (Backend API Server on port 3001):**
```bash
cd "C:\Users\Hi\.gemini\antigravity\scratch\page-counter\server"
npm run dev
```

**Terminal 2 (Frontend React App on port 5173):**
```bash
cd "C:\Users\Hi\.gemini\antigravity\scratch\page-counter\client"
npm run dev
```

### Step 4: Open in Your Browser
Open your web browser and navigate to:
```
http://localhost:5173
```

Type any website domain (such as `example.com`) and click **Count Pages**!

---

## 🧪 Automated Testing

Automated tests test all security validations, sitemap handling, link extraction, and CSV generation offline using mock fixtures without crawling third-party servers:

```bash
cd "C:\Users\Hi\.gemini\antigravity\scratch\page-counter\server"
npm test
```

### Test Coverage Summary:
- ✅ **URL Validation & Normalization:** Missing schemes, hash fragments, tracking params, trailing slashes.
- ✅ **SSRF Protection:** Loopback, RFC 1918 private subnets, cloud metadata endpoints, IPv6 link-local.
- ✅ **Sitemap Parsing:** `<urlset>` with XML namespaces, `<sitemapindex>` with child sitemaps, malformed XML.
- ✅ **Link Crawler:** Anchor tag extraction, relative link resolution, duplicate filtering, action/logout filtering.
- ✅ **Safe Fetch & Redirects:** Redirect loop protection, redirect SSRF blocking, 2MB size cap enforcement.
- ✅ **CSV Export:** RFC 4180 escaping for quotes, commas, and linebreaks.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/scan/start` | Initiates a new scan. Accepts `{ url, mode, maxPages, maxDepth, respectRobotsTxt }`. |
| `GET` | `/api/scan/:scanId/stream` | Server-Sent Events (SSE) stream for live updates. |
| `POST` | `/api/scan/:scanId/stop` | Halts an ongoing scan. |
| `GET` | `/api/scan/:scanId` | Retrieves complete scan details, logs, and URL list. |
| `GET` | `/api/scan/:scanId/export/csv` | Downloads RFC 4180 CSV spreadsheet. |
| `GET` | `/api/health` | Health check endpoint. |

---

## 📂 Project Structure

```text
page-counter/
├── client/                      # React + TypeScript + Vite + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx           # Navbar, badges, log drawer button
│   │   │   ├── UrlInputBar.tsx      # Target URL input, mode toggle, limit options
│   │   │   ├── ScanProgress.tsx     # Animated progress bar, stopwatch, status
│   │   │   ├── ResultsDashboard.tsx # Summary metrics cards, quick actions
│   │   │   ├── UrlResultsTable.tsx  # Searchable, sortable, filterable table
│   │   │   ├── InfoNotice.tsx       # Educational SEO & sitemap disclosure
│   │   │   └── ScanLogsModal.tsx    # Live terminal console drawer
│   │   ├── types/index.ts           # Frontend TypeScript types
│   │   ├── App.tsx                  # Main orchestration component & SSE handler
│   │   ├── main.tsx                 # DOM render entry
│   │   └── index.css                # Tailwind styling
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── server/                      # Node.js + Express + TypeScript Backend
│   ├── src/
│   │   ├── security/
│   │   │   └── ssrf-guard.ts        # Comprehensive SSRF & IP blocklist guard
│   │   ├── services/
│   │   │   ├── crawler-service.ts   # HTML parser & recursive link crawler
│   │   │   ├── sitemap-service.ts   # XML sitemap & sitemapindex parser
│   │   │   ├── robots-service.ts    # /robots.txt directive analyzer
│   │   │   ├── safe-fetch.ts        # Safe HTTP client with size/timeout/SSRF limits
│   │   │   └── scan-manager.ts      # Scan session manager & SSE broadcaster
│   │   ├── routes/
│   │   │   └── scan-routes.ts       # Express API routes
│   │   ├── utils/
│   │   │   ├── url-utils.ts         # URL normalization and link validation
│   │   │   └── csv-exporter.ts      # RFC 4180 CSV generator
│   │   ├── types/index.ts           # Server TypeScript types
│   │   └── index.ts                 # Express server bootstrap
│   ├── tests/                       # Vitest test suite (34 automated tests)
│   │   ├── ssrf-guard.test.ts
│   │   ├── url-utils.test.ts
│   │   ├── sitemap-service.test.ts
│   │   ├── crawler-service.test.ts
│   │   ├── safe-fetch.test.ts
│   │   └── csv-export.test.ts
│   ├── package.json
│   └── tsconfig.json
├── .env.example
├── package.json                 # Root script runner
└── README.md                    # Beginner documentation
```
