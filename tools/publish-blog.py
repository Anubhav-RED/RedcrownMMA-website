#!/usr/bin/env python3
"""
REDCROWN MMA — Blog Publisher
==============================
Usage (run from project root):
    python tools/publish-blog.py tools/posts/my-article.txt

.txt file format:
    TITLE:    Full article title
    DATE:     2026-06-23
    CATEGORY: Beginners Guide
    SLUG:     url-friendly-slug-here
    EXCERPT:  One sentence shown on blog index.
    ---
    First paragraph of your article.

    Second paragraph (blank line = paragraph break).

    ## Section Heading (h2)

    More content...

    ### Sub-heading (h3)

    > Blockquote text

Output:
    pages/[slug].html       — the blog post page
    pages/blog.html         — updated blog index (new card added)
"""

import sys, os, re, textwrap
from datetime import datetime

# ── paths ────────────────────────────────────────────────────────────────────
ROOT      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES_DIR = os.path.join(ROOT, 'pages')
BLOG_IDX  = os.path.join(PAGES_DIR, 'blog.html')

WA_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" style="fill:currentColor;flex-shrink:0;"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.93.56 3.83 1.6 5.47L2 22l4.79-1.66a9.86 9.86 0 0 0 5.25 1.5h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.81 14.07c-.25.7-1.45 1.34-2 1.43-.51.08-1.15.12-1.85-.12-.43-.14-.98-.33-1.69-.64-2.97-1.28-4.9-4.27-5.05-4.47-.15-.2-1.21-1.6-1.21-3.05 0-1.45.76-2.16 1.03-2.46.27-.3.6-.37.8-.37.2 0 .4 0 .57.01.18.01.43-.07.67.51.25.6.85 2.07.92 2.22.07.15.12.33.02.53-.1.2-.15.32-.3.49-.15.17-.31.38-.45.51-.15.14-.3.29-.13.58.18.3.8 1.32 1.71 2.13 1.18 1.05 2.18 1.38 2.49 1.53.31.15.49.13.67-.05.18-.18.78-.91.99-1.22.2-.31.41-.26.68-.16.27.1 1.74.82 2.04.97.3.15.5.22.58.34.07.13.07.74-.18 1.44z"/></svg>'

MODAL_HTML = """<div class="modal-backdrop" id="booking-modal">
  <div class="modal">
    <div class="modal-header">
      <div>
        <span class="section-num" style="margin-bottom:0.4rem;">Founding Access</span>
        <h3>Book Your Free Class</h3>
      </div>
      <button class="modal-close" aria-label="Close">✕</button>
    </div>
    <form class="modal-form">
      <div class="form-group">
        <label>Full Name <span class="req">*</span></label>
        <input type="text" name="name" required placeholder="Your name">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Phone <span class="req">*</span></label>
          <input type="tel" name="phone" required placeholder="+91 00000 00000">
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" name="email" placeholder="you@email.com">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Discipline</label>
          <select name="discipline">
            <option value="">Not sure yet</option>
            <option value="mma">MMA</option>
            <option value="bjj">BJJ</option>
            <option value="muaythai">Muay Thai</option>
            <option value="boxing">Boxing</option>
            <option value="snc">Strength &amp; Conditioning</option>
            <option value="selfdefence">Self Defence</option>
          </select>
        </div>
        <div class="form-group">
          <label>Preferred Batch</label>
          <select name="batch">
            <option value="">No preference</option>
            <option value="morning">Morning</option>
            <option value="evening">Evening</option>
          </select>
        </div>
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%; margin-top:0.5rem;"><span>Step In →</span></button>
      <div class="form-divider"><span>or connect directly</span></div>
      <button type="button" class="btn-wa">{wa_svg}<span>Book via WhatsApp</span></button>
      <p class="form-note">No spam. We'll reach out to confirm your slot.</p>
    </form>
    <div class="modal-success">
      <div class="success-icon">⚔</div>
      <h3>You're In.</h3>
      <p>We'll reach out shortly to confirm your free class. Welcome to the hunt.</p>
    </div>
  </div>
</div>""".replace('{wa_svg}', WA_SVG)

# ── parse .txt file ──────────────────────────────────────────────────────────
def parse_post(filepath):
    with open(filepath, encoding='utf-8') as f:
        raw = f.read()

    if '---' not in raw:
        sys.exit("ERROR: No --- separator found. Add frontmatter above ---")

    front, body = raw.split('---', 1)
    meta = {}
    for line in front.strip().splitlines():
        if ':' in line:
            key, _, val = line.partition(':')
            meta[key.strip().upper()] = val.strip()

    required = ['TITLE', 'DATE', 'CATEGORY', 'SLUG', 'EXCERPT']
    for r in required:
        if r not in meta:
            sys.exit(f"ERROR: Missing required field: {r}")

    return meta, body.strip()

# ── convert body text → HTML ─────────────────────────────────────────────────
def body_to_html(text):
    html_parts = []
    blocks = re.split(r'\n{2,}', text.strip())
    for block in blocks:
        block = block.strip()
        if not block:
            continue
        if block.startswith('### '):
            html_parts.append(f'<h3>{block[4:]}</h3>')
        elif block.startswith('## '):
            html_parts.append(f'<h2>{block[3:]}</h2>')
        elif block.startswith('> '):
            html_parts.append(f'<blockquote><p>{block[2:]}</p></blockquote>')
        elif block.startswith('- '):
            items = [f'<li>{line[2:]}</li>' for line in block.splitlines() if line.startswith('- ')]
            html_parts.append(f'<ul>{"".join(items)}</ul>')
        elif re.match(r'^\d+\. ', block):
            items = [f'<li>{re.sub(r"^\d+\. ", "", line)}</li>'
                     for line in block.splitlines() if re.match(r'^\d+\. ', line)]
            html_parts.append(f'<ol>{"".join(items)}</ol>')
        else:
            # regular paragraph — handle **bold** and *italic*
            p = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', block)
            p = re.sub(r'\*(.+?)\*',     r'<em>\1</em>',         p)
            html_parts.append(f'<p>{p}</p>')
    return '\n'.join(html_parts)

# ── format date ──────────────────────────────────────────────────────────────
def fmt_date(d):
    try:
        return datetime.strptime(d, '%Y-%m-%d').strftime('%B %d, %Y')
    except:
        return d

# ── generate blog post HTML ──────────────────────────────────────────────────
def gen_post(meta, body_html):
    title    = meta['TITLE']
    date_raw = meta['DATE']
    cat      = meta['CATEGORY']
    excerpt  = meta['EXCERPT']
    date_fmt = fmt_date(date_raw)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} | Redcrown MMA Blog</title>
<meta name="description" content="{excerpt}">
<meta name="theme-color" content="#000F08">
<meta property="og:title" content="{title} | Redcrown MMA">
<meta property="og:description" content="{excerpt}">
<meta property="og:image" content="https://redcrownmma.com/assets/images/og-image.jpg">
<meta property="og:type" content="article">
<link rel="icon" type="image/png" sizes="32x32" href="../assets/favicon-32.png">
<link rel="apple-touch-icon" href="../assets/apple-touch-icon.png">
<link rel="stylesheet" href="../css/style.css">
<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "{title}",
  "description": "{excerpt}",
  "datePublished": "{date_raw}",
  "author": {{
    "@type": "Person",
    "name": "Aditya Heera",
    "jobTitle": "Head Coach & Founder, Redcrown MMA"
  }},
  "publisher": {{
    "@type": "Organization",
    "name": "Redcrown MMA",
    "url": "https://redcrownmma.com"
  }},
  "image": "https://redcrownmma.com/assets/images/og-image.jpg"
}}
</script>
<!-- GA4: Paste your Google Analytics script here. Get your Measurement ID from analytics.google.com -->
</head>
<body>

<div class="top-ticker">
  <div class="ticker-track">
    <span class="ticker-item">NOW OPEN <span class="t-sep">//</span> NOIDA SECTOR 18</span>
    <span class="ticker-item">FREE FIRST CLASS <span class="t-sep">//</span> NO EXPERIENCE NEEDED</span>
  </div>
</div>

<header class="nav">
  <div class="nav-inner">
    <a href="../index.html" class="nav-logo">
      <img src="../assets/logo.png" alt="Redcrown MMA">
    </a>
    <nav class="nav-links">
      <a href="../index.html">Home</a>
      <a href="programs.html">Programs</a>
      <a href="schedule.html">Schedule</a>
      <a href="coaches.html">Coaches</a>
      <a href="blog.html" class="active">Blog</a>
      <a href="contact.html">Contact</a>
    </nav>
    <div class="nav-actions">
      <button class="theme-toggle" aria-label="Cycle theme">
        <span class="t-icon">☾</span>
        <span class="t-lbl">AUTO</span>
      </button>
      <a href="#" class="btn btn-primary btn-sm" data-open-modal><span>Book Free Class</span></a>
      <button class="hamburger" aria-label="Menu"><span></span><span></span><span></span></button>
    </div>
  </div>
</header>

<div class="mobile-nav">
  <a href="../index.html">Home</a>
  <a href="programs.html">Programs</a>
  <a href="schedule.html">Schedule</a>
  <a href="coaches.html">Coaches</a>
  <a href="blog.html">Blog</a>
  <a href="contact.html">Contact</a>
  <a href="#" class="btn btn-primary" data-open-modal><span>Book Free Class</span></a>
</div>

<section class="post-hero">
  <div class="container">
    <a href="blog.html" style="display:inline-flex;align-items:center;gap:0.5rem;font-family:'Rajdhani',sans-serif;font-size:0.68rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--bone-45);margin-bottom:1.5rem;text-decoration:none;transition:color 0.2s;" onmouseover="this.style.color='var(--hunt)'" onmouseout="this.style.color='var(--bone-45)'">← Back to Blog</a>
    <div class="post-meta-row" style="margin-bottom:1.25rem;">
      <span class="post-cat">{cat}</span>
      <span>{date_fmt}</span>
    </div>
    <h1>{title}</h1>
    <p style="color:var(--bone-70); font-size:1.05rem; max-width:680px;">{excerpt}</p>
  </div>
</section>

<section style="padding-top:0; padding-bottom:0;">
  <div class="container">
    <article class="post-body">
{body_html}

      <div class="post-cta">
        <h3>Train at Redcrown MMA — Noida Sector 18</h3>
        <p>Your first class is free. No experience needed. Book it below.</p>
        <a href="#" class="btn btn-primary" data-open-modal><span>Book Your Free Class →</span></a>
      </div>
    </article>
  </div>
</section>

<footer class="footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <img src="../assets/logo.png" alt="Redcrown MMA">
        <p class="footer-desc">Elite MMA training in Noida Sector 18. Real coaches, real results. Seven disciplines, one membership, zero ego.</p>
        <div class="footer-socials">
          <a href="https://instagram.com/redcrownmma" class="soc-link" target="_blank" rel="noopener">IG</a>
          <a href="https://wa.me/919910604536" class="soc-link" target="_blank" rel="noopener">WA</a>
        </div>
      </div>
      <div class="footer-col">
        <h5>Navigate</h5>
        <ul>
          <li><a href="programs.html">Programs</a></li>
          <li><a href="schedule.html">Schedule</a></li>
          <li><a href="coaches.html">Coaches</a></li>
          <li><a href="blog.html">Blog</a></li>
          <li><a href="contact.html">Contact</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h5>Programs</h5>
        <ul>
          <li><a href="programs.html#mma">MMA</a></li>
          <li><a href="programs.html#bjj">BJJ</a></li>
          <li><a href="programs.html#muaythai">Muay Thai</a></li>
          <li><a href="programs.html#boxing">Boxing</a></li>
          <li><a href="programs.html#selfdefence">Self Defence</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h5>Contact</h5>
        <ul>
          <li><a href="tel:+919910604536">+91 99106 04536</a></li>
          <li><a href="mailto:manager@redcrownmma.com">manager@redcrownmma.com</a></li>
          <li><a href="contact.html">Noida Sector 18, UP</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bot">
      <span class="footer-copy">© 2026 Redcrown MMA. All rights reserved.</span>
      <div class="footer-legal">
        <a href="privacy.html">Privacy Policy</a>
        <a href="terms.html">Terms &amp; Conditions</a>
      </div>
    </div>
  </div>
</footer>

<a href="https://wa.me/919910604536?text=Hi%20Redcrown%20MMA!%20I%27d%20like%20to%20book%20a%20free%20class." class="wa-fab" aria-label="WhatsApp" target="_blank" rel="noopener">
  <svg viewBox="0 0 24 24"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.93.56 3.83 1.6 5.47L2 22l4.79-1.66a9.86 9.86 0 0 0 5.25 1.5h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.81 14.07c-.25.7-1.45 1.34-2 1.43-.51.08-1.15.12-1.85-.12-.43-.14-.98-.33-1.69-.64-2.97-1.28-4.9-4.27-5.05-4.47-.15-.2-1.21-1.6-1.21-3.05 0-1.45.76-2.16 1.03-2.46.27-.3.6-.37.8-.37.2 0 .4 0 .57.01.18.01.43-.07.67.51.25.6.85 2.07.92 2.22.07.15.12.33.02.53-.1.2-.15.32-.3.49-.15.17-.31.38-.45.51-.15.14-.3.29-.13.58.18.3.8 1.32 1.71 2.13 1.18 1.05 2.18 1.38 2.49 1.53.31.15.49.13.67-.05.18-.18.78-.91.99-1.22.2-.31.41-.26.68-.16.27.1 1.74.82 2.04.97.3.15.5.22.58.34.07.13.07.74-.18 1.44z"/></svg>
</a>

{MODAL_HTML}

<div id="wipe"></div>
<script src="../js/main.js"></script>
</body>
</html>"""

# ── update blog index ────────────────────────────────────────────────────────
def update_blog_index(meta, body_html):
    slug     = meta['SLUG']
    title    = meta['TITLE']
    cat      = meta['CATEGORY']
    excerpt  = meta['EXCERPT']
    date_raw = meta['DATE']
    date_fmt = fmt_date(date_raw)

    new_card = f"""<a href="{slug}.html" class="blog-card">
  <span class="blog-cat">{cat}</span>
  <h3>{title}</h3>
  <p>{excerpt}</p>
  <span class="blog-date">{date_fmt}</span>
  <span class="blog-read">Read Article →</span>
</a>"""

    with open(BLOG_IDX) as f:
        idx = f.read()

    start_marker = '<!-- BLOG_POSTS_START -->'
    end_marker   = '<!-- BLOG_POSTS_END -->'

    if start_marker not in idx or end_marker not in idx:
        sys.exit("ERROR: blog.html is missing BLOG_POSTS_START/END markers")

    start = idx.find(start_marker) + len(start_marker)
    end   = idx.find(end_marker)
    current_content = idx[start:end].strip()

    # Remove the placeholder if present
    if 'no-posts' in current_content:
        new_content = f'\n{new_card}\n'
    else:
        new_content = f'\n{new_card}\n{current_content}\n'

    new_idx = idx[:start] + new_content + idx[end:]

    with open(BLOG_IDX, 'w') as f:
        f.write(new_idx)

# ── main ─────────────────────────────────────────────────────────────────────
def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)

    txt_path = sys.argv[1]
    if not os.path.exists(txt_path):
        sys.exit(f"ERROR: File not found: {txt_path}")

    print(f"\n📄  Reading: {txt_path}")
    meta, body_text = parse_post(txt_path)

    slug      = meta['SLUG']
    out_path  = os.path.join(PAGES_DIR, f"{slug}.html")
    body_html = body_to_html(body_text)

    print(f"⚙   Generating: {out_path}")
    post_html = gen_post(meta, body_html)

    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(post_html)

    print(f"📋  Updating blog index: {BLOG_IDX}")
    update_blog_index(meta, body_html)

    print(f"\n✅  Done.")
    print(f"    Post:  pages/{slug}.html")
    print(f"    Live:  https://redcrownmma.com/pages/{slug}.html\n")

if __name__ == '__main__':
    main()
