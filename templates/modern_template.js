
// Modern Clean Blog Template
addEventListener('fetch', event => {
event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
const url = new URL(request.url)
const path = url.pathname

// Handle different routes
if (path === '/') {
  return getHomePage(request.url)
} else if (path.startsWith('/category/')) {
  const category = decodeURIComponent(path.split('/')[2])
  return getCategoryPage(category, request.url)
} else if (path.startsWith('/tag/')) {
  const tag = decodeURIComponent(path.split('/')[2])
  return getTagPage(tag, request.url)
} else if (path === '/api/posts') {
  return new Response(JSON.stringify(posts), {
    headers: { 'Content-Type': 'application/json' }
  })
} else if (path === '/feed.xml' || path === '/rss.xml') {
  return getRSSFeed(request.url)
} else if (path === '/sitemap.xml') {
  return getSitemap(request.url)
} else {
  // Try to find post by slug (remove leading slash)
  const postSlug = path.substring(1)
  const post = posts.find(p => p.id === postSlug)
  if (post) {
    return getPostPage(postSlug, request.url)
  }
  return getHomePage(request.url)
}
}

// Posts data - akan diisi oleh Streamlit
const posts = {{POSTS_DATA}};
const adsConfig = {{ADS_CONFIG}};

function getAdCode(adType) {
if (!adsConfig || !adsConfig[adType] || !adsConfig[adType].enabled || !adsConfig[adType].code) {
  return '';
}
return adsConfig[adType].code;
}

const BLOG_CONFIG = {
title: "My Modern Blog",
subtitle: "Berbagi pengetahuan dan pengalaman",
author: "Blog Author",
description: "Blog modern dengan design clean dan minimalis",
domain: "example.com" // Ganti dengan domain Anda
};

function getRSSFeed(currentDomain) {
const domain = new URL(currentDomain).hostname || BLOG_CONFIG.domain;

const rssItems = posts.map(post => `
  <item>
    <title><![CDATA[${post.title}]]></title>
    <link>https://${domain}/${post.id}</link>
    <guid>https://${domain}/${post.id}</guid>
    <description><![CDATA[${post.excerpt}]]></description>
    <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    <author>${post.author}</author>
    ${post.category ? `<category><![CDATA[${post.category}]]></category>` : ''}
  </item>
`).join('');

const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title><![CDATA[${BLOG_CONFIG.title}]]></title>
  <description><![CDATA[${BLOG_CONFIG.description}]]></description>
  <link>https://${domain}</link>
  <atom:link href="https://${domain}/feed.xml" rel="self" type="application/rss+xml"/>
  <language>id-ID</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  <generator>Cloudflare Workers Blog</generator>
  ${rssItems}
</channel>
</rss>`;

return new Response(rssXml, {
  headers: { 
    'Content-Type': 'application/rss+xml; charset=UTF-8',
    'Cache-Control': 'public, max-age=3600'
  }
});
}

function getSitemap(currentDomain) {
const domain = new URL(currentDomain).hostname || BLOG_CONFIG.domain;

const urls = [
  {
    loc: `https://${domain}/`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'daily',
    priority: '1.0'
  }
];

// Add category pages
const categories = [...new Set(posts.map(p => p.category).filter(Boolean))];
categories.forEach(category => {
  urls.push({
    loc: `https://${domain}/category/${encodeURIComponent(category)}`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: '0.8'
  });
});

// Add tag pages
const allTags = posts.flatMap(p => p.tags || []);
const uniqueTags = [...new Set(allTags)];
uniqueTags.forEach(tag => {
  urls.push({
    loc: `https://${domain}/tag/${encodeURIComponent(tag)}`,
    lastmod: new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: '0.6'
  });
});

// Add post pages
posts.forEach(post => {
  urls.push({
    loc: `https://${domain}/${post.id}`,
    lastmod: post.date,
    changefreq: 'monthly',
    priority: '0.9'
  });
});

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `
<url>
  <loc>${url.loc}</loc>
  <lastmod>${url.lastmod}</lastmod>
  <changefreq>${url.changefreq}</changefreq>
  <priority>${url.priority}</priority>
</url>`).join('')}
</urlset>`;

return new Response(sitemapXml, {
  headers: { 
    'Content-Type': 'application/xml; charset=UTF-8',
    'Cache-Control': 'public, max-age=86400'
  }
});
}

function getHomePage(currentDomain) {
const domain = new URL(currentDomain).hostname || BLOG_CONFIG.domain;
const postsHtml = posts.map(post => `
  <article class="post-card">
    <h2 class="post-title">
      <a href="/${post.id}">${post.title}</a>
    </h2>
    <div class="post-meta">
      <span>📅 ${post.date}</span>
      <span>✍️ ${post.author}</span>
      ${post.category ? `<span>🏷️ <a href="/category/${encodeURIComponent(post.category)}">${post.category}</a></span>` : ''}
    </div>
    ${post.tags && post.tags.length > 0 ? `
      <div class="post-tags">
        ${post.tags.map(tag => `<a href="/tag/${encodeURIComponent(tag)}" class="tag">#${tag}</a>`).join(' ')}
      </div>
    ` : ''}
    <div class="post-content">${post.excerpt}</div>
    <a href="/${post.id}" class="read-more">
      Baca selengkapnya <span>→</span>
    </a>
  </article>
`).join('');

// Get categories and tags for sidebar
const categories = [...new Set(posts.map(p => p.category).filter(Boolean))];
const allTags = posts.flatMap(p => p.tags || []);
const popularTags = [...new Set(allTags)].slice(0, 10);

const sidebarHtml = `
  <div class="sidebar">
    <div class="widget">
      <h3>📂 Kategori</h3>
      <ul class="category-list">
        ${categories.map(cat => `
          <li><a href="/category/${encodeURIComponent(cat)}">${cat}</a> 
              <span class="count">(${posts.filter(p => p.category === cat).length})</span>
          </li>
        `).join('')}
      </ul>
    </div>

    <div class="widget">
      <h3>🏷️ Tags Populer</h3>
      <div class="tag-cloud">
        ${popularTags.map(tag => `
          <a href="/tag/${encodeURIComponent(tag)}" class="tag-cloud-item">${tag}</a>
        `).join(' ')}
      </div>
    </div>

    <div class="widget">
      <h3>📈 Post Terbaru</h3>
      <ul class="recent-posts">
        ${posts.slice(0, 5).map(post => `
          <li><a href="/${post.id}">${post.title}</a></li>
        `).join('')}
      </ul>
    </div>
    ${getAdCode('sidebar_ad') ? `
      <div class="widget">
        <h3>Iklan</h3>
        ${getAdCode('sidebar_ad')}
      </div>
    ` : ''}
  </div>
`;

return new Response(HTML_TEMPLATE
  .replace('{{title}}', BLOG_CONFIG.title)
  .replace('{{description}}', BLOG_CONFIG.description)
  .replace('{{hero}}', `
    <div class="hero">
      <div class="container">
        <h1>${BLOG_CONFIG.title}</h1>
        <p>${BLOG_CONFIG.subtitle}</p>
        ${getAdCode('header_ad') ? `<div class="header-ad">${getAdCode('header_ad')}</div>` : ''}
      </div>
    </div>
  `)
  .replace('{{content}}', `
    <div class="main-content">
      ${postsHtml}
    </div>
    ${sidebarHtml}
  `)
  .replace('{{canonical_url}}', `https://${domain}`), {
  headers: { 'Content-Type': 'text/html' }
});
}

function getPostPage(postId, currentDomain) {
const domain = new URL(currentDomain).hostname || BLOG_CONFIG.domain;
const post = posts.find(p => p.id === postId);
if (!post) {
  return new Response('Post tidak ditemukan', { status: 404 });
}

const content = `
  <div class="main-content">
    <article class="single-post">
      <h1 class="post-title">${post.title}</h1>
      <div class="post-meta">
        <span>📅 ${post.date}</span>
        <span>✍️ ${post.author}</span>
        ${post.category ? `<span>🏷️ <a href="/category/${encodeURIComponent(post.category)}">${post.category}</a></span>` : ''}
      </div>
      ${post.tags && post.tags.length > 0 ? `
        <div class="post-tags">
          ${post.tags.map(tag => `<a href="/tag/${encodeURIComponent(tag)}" class="tag">#${tag}</a>`).join(' ')}
        </div>
      ` : ''}
      <div class="post-content">${post.content}</div>
      ${getAdCode('post_content_ad') ? `<div class="post-content-ad">${getAdCode('post_content_ad')}</div>` : ''}
    </article>
  </div>
  <div class="sidebar">
    <div class="widget">
      <h3>📂 Kategori</h3>
      <ul class="category-list">
        ${[...new Set(posts.map(p => p.category).filter(Boolean))].map(cat => `
          <li><a href="/category/${encodeURIComponent(cat)}">${cat}</a></li>
        `).join('')}
      </ul>
    </div>
    ${getAdCode('sidebar_ad') ? `
      <div class="widget">
        <h3>Iklan</h3>
        ${getAdCode('sidebar_ad')}
      </div>
    ` : ''}
  </div>
`;

return new Response(HTML_TEMPLATE
  .replace('{{title}}', `${post.title} - ${BLOG_CONFIG.title}`)
  .replace('{{description}}', post.excerpt)
  .replace('{{hero}}', '')
  .replace('{{content}}', content)
  .replace('{{canonical_url}}', `https://${domain}/${postId}`), {
  headers: { 'Content-Type': 'text/html' }
});
}

function getCategoryPage(category, currentDomain) {
const domain = new URL(currentDomain).hostname || BLOG_CONFIG.domain;
const categoryPosts = posts.filter(post => 
  post.category && post.category.toLowerCase() === category.toLowerCase()
);

const postsHtml = categoryPosts.map(post => `
  <article class="post-card">
    <h2 class="post-title">
      <a href="/${post.id}">${post.title}</a>
    </h2>
    <div class="post-meta">
      <span>📅 ${post.date}</span>
      <span>✍️ ${post.author}</span>
    </div>
    ${post.tags && post.tags.length > 0 ? `
      <div class="post-tags">
        ${post.tags.map(tag => `<a href="/tag/${encodeURIComponent(tag)}" class="tag">#${tag}</a>`).join(' ')}
      </div>
    ` : ''}
    <div class="post-content">${post.excerpt}</div>
    <a href="/${post.id}" class="read-more">
      Baca selengkapnya <span>→</span>
    </a>
  </article>
`).join('');

const content = categoryPosts.length > 0 ? `
  <div class="main-content">
    <div class="archive-header">
      <h1>Kategori: ${category}</h1>
      <p>Menampilkan ${categoryPosts.length} artikel dalam kategori ini</p>
    </div>
    ${postsHtml}
  </div>
` : `
  <div class="main-content">
    <div class="archive-header">
      <h1>Kategori: ${category}</h1>
      <p>Tidak ada artikel dalam kategori ini</p>
      <a href="/" class="btn">← Kembali ke Beranda</a>
    </div>
  </div>
`;

return new Response(HTML_TEMPLATE
  .replace('{{title}}', `Kategori ${category} - ${BLOG_CONFIG.title}`)
  .replace('{{description}}', `Artikel dalam kategori ${category}`)
  .replace('{{hero}}', '')
  .replace('{{content}}', content)
  .replace('{{canonical_url}}', `https://${domain}/category/${encodeURIComponent(category)}`), {
  headers: { 'Content-Type': 'text/html' }
});
}

function getTagPage(tag, currentDomain) {
const domain = new URL(currentDomain).hostname || BLOG_CONFIG.domain;
const tagPosts = posts.filter(post => 
  post.tags && post.tags.some(t => t.toLowerCase() === tag.toLowerCase())
);

const postsHtml = tagPosts.map(post => `
  <article class="post-card">
    <h2 class="post-title">
      <a href="/${post.id}">${post.title}</a>
    </h2>
    <div class="post-meta">
      <span>📅 ${post.date}</span>
      <span>✍️ ${post.author}</span>
      ${post.category ? `<span>🏷️ <a href="/category/${encodeURIComponent(post.category)}">${post.category}</a></span>` : ''}
    </div>
    <div class="post-content">${post.excerpt}</div>
    <a href="/${post.id}" class="read-more">
      Baca selengkapnya <span>→</span>
    </a>
  </article>
`).join('');

const content = tagPosts.length > 0 ? `
  <div class="main-content">
    <div class="archive-header">
      <h1>Tag: #${tag}</h1>
      <p>Menampilkan ${tagPosts.length} artikel dengan tag ini</p>
    </div>
    ${postsHtml}
  </div>
` : `
  <div class="main-content">
    <div class="archive-header">
      <h1>Tag: #${tag}</h1>
      <p>Tidak ada artikel dengan tag ini</p>
      <a href="/" class="btn">← Kembali ke Beranda</a>
    </div>
  </div>
`;

return new Response(HTML_TEMPLATE
  .replace('{{title}}', `Tag ${tag} - ${BLOG_CONFIG.title}`)
  .replace('{{description}}', `Artikel dengan tag ${tag}`)
  .replace('{{hero}}', '')
  .replace('{{content}}', content)
  .replace('{{canonical_url}}', `https://${domain}/tag/${encodeURIComponent(tag)}`), {
  headers: { 'Content-Type': 'text/html' }
});
}

const HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
  <meta name="description" content="{{description}}">
  <link rel="alternate" type="application/rss+xml" title="${BLOG_CONFIG.title} RSS Feed" href="/feed.xml">
  <meta name="robots" content="index, follow">
  <meta property="og:title" content="{{title}}">
  <meta property="og:description" content="{{description}}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="{{canonical_url}}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="{{title}}">
  <meta name="twitter:description" content="{{description}}">
  <link rel="canonical" href="{{canonical_url}}">
  <style>
      * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
      }

      body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f8f9fa;
      }

      .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
      }

      header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1rem 0;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      }

      nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
      }

      .logo {
          font-size: 1.5rem;
          font-weight: bold;
      }

      .nav-links {
          display: flex;
          list-style: none;
          gap: 2rem;
      }

      .nav-links a {
          color: white;
          text-decoration: none;
          transition: opacity 0.3s;
      }

      .nav-links a:hover {
          opacity: 0.8;
      }

      .hero {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-align: center;
          padding: 4rem 0;
      }

      .hero h1 {
          font-size: 3rem;
          margin-bottom: 1rem;
      }

      .hero p {
          font-size: 1.2rem;
          opacity: 0.9;
      }

      main {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 2rem;
          padding: 2rem 0;
          max-width: 1200px;
          margin: 0 auto;
          padding-left: 20px;
          padding-right: 20px;
      }

      .main-content {
          background: white;
          border-radius: 10px;
          padding: 2rem;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      }

      .post-card {
          background: white;
          border-radius: 10px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          transition: transform 0.3s, box-shadow 0.3s;
      }

      .post-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15);
      }

      .post-title {
          margin-bottom: 1rem;
      }

      .post-title a {
          color: #333;
          text-decoration: none;
          transition: color 0.3s;
      }

      .post-title a:hover {
          color: #667eea;
      }

      .post-meta {
          color: #666;
          font-size: 0.9rem;
          margin-bottom: 1rem;
      }

      .post-meta span {
          margin-right: 1rem;
      }

      .post-meta a {
          color: #667eea;
          text-decoration: none;
      }

      .post-tags {
          margin: 1rem 0;
      }

      .tag {
          display: inline-block;
          background: #e3f2fd;
          color: #1976d2;
          padding: 0.2rem 0.5rem;
          border-radius: 15px;
          text-decoration: none;
          font-size: 0.8rem;
          margin-right: 0.5rem;
          margin-bottom: 0.5rem;
          transition: background 0.3s;
      }

      .tag:hover {
          background: #bbdefb;
      }

      .post-content {
          color: #555;
          line-height: 1.8;
          margin-bottom: 1rem;
      }

      .read-more {
          color: #667eea;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.3s;
      }

      .read-more:hover {
          color: #764ba2;
      }

      .sidebar {
          background: white;
          border-radius: 10px;
          padding: 2rem;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          height: fit-content;
      }

      .widget {
          margin-bottom: 2rem;
      }

      .widget h3 {
          color: #333;
          margin-bottom: 1rem;
          font-size: 1.1rem;
      }

      .category-list {
          list-style: none;
      }

      .category-list li {
          padding: 0.5rem 0;
          border-bottom: 1px solid #eee;
      }

      .category-list a {
          color: #333;
          text-decoration: none;
          transition: color 0.3s;
      }

      .category-list a:hover {
          color: #667eea;
      }

      .count {
          color: #999;
          font-size: 0.8rem;
      }

      .tag-cloud {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
      }

      .tag-cloud-item {
          background: #f1f3f4;
          color: #333;
          padding: 0.3rem 0.6rem;
          border-radius: 20px;
          text-decoration: none;
          font-size: 0.8rem;
          transition: background 0.3s;
      }

      .tag-cloud-item:hover {
          background: #e8f0fe;
          color: #1976d2;
      }

      .recent-posts {
          list-style: none;
      }

      .recent-posts li {
          padding: 0.5rem 0;
          border-bottom: 1px solid #eee;
      }

      .recent-posts a {
          color: #333;
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.3s;
      }

      .recent-posts a:hover {
          color: #667eea;
      }

      .archive-header {
          text-align: center;
          padding: 2rem 0;
          border-bottom: 2px solid #eee;
          margin-bottom: 2rem;
      }

      .archive-header h1 {
          color: #333;
          margin-bottom: 0.5rem;
      }

      .archive-header p {
          color: #666;
      }

      .btn {
          display: inline-block;
          background: #667eea;
          color: white;
          padding: 0.7rem 1.5rem;
          text-decoration: none;
          border-radius: 5px;
          margin-top: 1rem;
          transition: background 0.3s;
      }

      .btn:hover {
          background: #764ba2;
      }

      .single-post {
          max-width: none;
      }

      .single-post .post-content {
          font-size: 1.1rem;
          line-height: 1.8;
      }

      .single-post img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 1rem 0;
      }

      footer {
          background: #333;
          color: white;
          text-align: center;
          padding: 2rem 0;
          margin-top: 4rem;
      }

      @media (max-width: 768px) {
          main {
              grid-template-columns: 1fr;
          }

          .hero h1 {
              font-size: 2rem;
          }

          .nav-links {
              flex-direction: column;
              gap: 1rem;
          }

          .container {
              padding: 0 15px;
          }
      }
  </style>
</head>
<body>
  <header>
      <nav class="container">
          <div class="logo">${BLOG_CONFIG.title}</div>
          <ul class="nav-links">
              <li><a href="/">🏠 Beranda</a></li>
              <li><a href="#about">📖 Tentang</a></li>
              <li><a href="#contact">📧 Kontak</a></li>
          </ul>
      </nav>
  </header>

  {{hero}}

  <main>
      {{content}}
  </main>

  <footer>
      <div class="container">
          <p>&copy; 2024 ${BLOG_CONFIG.title}. Dibuat dengan ❤️ menggunakan Cloudflare Workers.</p>
          ${getAdCode('footer_ad') ? `<div class="footer-ad">${getAdCode('footer_ad')}</div>` : ''}
      </div>
  </footer>
  ${getAdCode('popup_ad') ? `
      <div id="popup-ad" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10000; background: white; padding: 2rem; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); max-width: 90vw; max-height: 90vh; overflow: auto;">
          <button onclick="closePopupAd()" style="position: absolute; top: 10px; right: 15px; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #999;">&times;</button>
          ${getAdCode('popup_ad')}
      </div>
      <div id="popup-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999;" onclick="closePopupAd()"></div>

      <script>
          function showPopupAd() {
              document.getElementById('popup-ad').style.display = 'block';
              document.getElementById('popup-overlay').style.display = 'block';
              document.body.style.overflow = 'hidden';
          }

          function closePopupAd() {
              document.getElementById('popup-ad').style.display = 'none';
              document.getElementById('popup-overlay').style.display = 'none';
              document.body.style.overflow = 'auto';
              localStorage.setItem('popup-ad-closed', Date.now());
          }

          // Show popup after 10 seconds if not closed in last 24 hours
          setTimeout(function() {
              const lastClosed = localStorage.getItem('popup-ad-closed');
              const now = Date.now();
              const oneDay = 24 * 60 * 60 * 1000;

              if (!lastClosed || (now - lastClosed) > oneDay) {
                  showPopupAd();
              }
          }, 10000);
      </script>
  ` : ''}
</body>
</html>
`;
