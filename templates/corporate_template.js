
// Corporate Professional Blog Template
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

const posts = {{POSTS_DATA}};
const adsConfig = {{ADS_CONFIG}};

function getAdCode(adType) {
if (!adsConfig || !adsConfig[adType] || !adsConfig[adType].enabled || !adsConfig[adType].code) {
  return '';
}
return adsConfig[adType].code;
}

const BLOG_CONFIG = {
title: "Corporate Blog",
subtitle: "Insights & Industry Knowledge",
author: "Corporate Team",
description: "Professional insights dan knowledge sharing",
phone: "+62 21 1234 5678",
email: "info@company.com",
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
const categories = [...new Set(posts.map(p => p.category).filter(Boolean))];
const recentPosts = posts.slice(0, 6);

const content = `
  <div class="hero-section">
    <div class="hero-content">
      <h1>${BLOG_CONFIG.title}</h1>
      <p>${BLOG_CONFIG.subtitle}</p>
      <a href="#posts" class="cta-button">Explore Articles</a>
      ${getAdCode('hero_section_ad') ? `<div class="hero-section-ad">${getAdCode('hero_section_ad')}</div>` : ''}
    </div>
  </div>

  <div class="categories-section">
    <h2>Kategori Bisnis</h2>
    <div class="categories-grid">
      ${categories.map(cat => `
        <a href="/category/${encodeURIComponent(cat)}" class="category-card">
          <h3>${cat}</h3>
          <p>${posts.filter(p => p.category === cat).length} Articles</p>
        </a>
      `).join('')}
      ${getAdCode('categories_grid_ad') ? `<div class="categories-grid-ad">${getAdCode('categories_grid_ad')}</div>` : ''}
    </div>
  </div>

  <div id="posts" class="posts-section">
    <h2>Latest Insights</h2>
    <div class="posts-grid">
      ${recentPosts.map(post => `
        <article class="post-card">
          <div class="post-header">
            <h3><a href="/${post.id}">${post.title}</a></h3>
            <div class="post-meta">
              <span>📅 ${post.date}</span>
              <span>✍️ ${post.author}</span>
              ${post.category ? `<span>🏢 ${post.category}</span>` : ''}
            </div>
          </div>
          ${post.tags ? `
            <div class="post-tags">
              ${post.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ')}
            </div>
          ` : ''}
          <div class="post-excerpt">${post.excerpt}</div>
          <a href="/${post.id}" class="read-more">Read More →</a>
        </article>
      `).join('')}
      ${getAdCode('posts_grid_ad') ? `<div class="posts-grid-ad">${getAdCode('posts_grid_ad')}</div>` : ''}
    </div>
  </div>
`;

return new Response(HTML_TEMPLATE
  .replace('{{title}}', BLOG_CONFIG.title)
  .replace('{{description}}', BLOG_CONFIG.description)
  .replace('{{content}}', content)
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
  <article class="single-post">
    <header class="post-header">
      <h1>${post.title}</h1>
      <div class="post-meta">
        <span>📅 ${post.date}</span>
        <span>✍️ ${post.author}</span>
        ${post.category ? `<span>🏢 <a href="/category/${encodeURIComponent(post.category)}">${post.category}</a></span>` : ''}
      </div>
      ${post.tags ? `
        <div class="post-tags">
          ${post.tags.map(tag => `<a href="/tag/${encodeURIComponent(tag)}" class="tag">${tag}</a>`).join(' ')}
        </div>
      ` : ''}
    </header>
    <div class="post-content">${post.content}</div>
    ${getAdCode('post_content_ad') ? `<div class="post-content-ad">${getAdCode('post_content_ad')}</div>` : ''}

    <div class="contact-cta">
      <h3>Need Professional Consultation?</h3>
      <p>Contact our experts for personalized business solutions.</p>
      <div class="contact-info">
        <span>📞 ${BLOG_CONFIG.phone}</span>
        <span>📧 ${BLOG_CONFIG.email}</span>
      </div>
    </div>
  </article>
`;

return new Response(HTML_TEMPLATE
  .replace('{{title}}', `${post.title} - ${BLOG_CONFIG.title}`)
  .replace('{{description}}', post.excerpt)
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

const content = `
  <div class="archive-header">
    <h1>${category} Insights</h1>
    <p>Professional articles and insights in ${category}</p>
    ${getAdCode('archive_header_ad') ? `<div class="archive-header-ad">${getAdCode('archive_header_ad')}</div>` : ''}
  </div>

  <div class="posts-grid">
    ${categoryPosts.map(post => `
      <article class="post-card">
        <h3><a href="/${post.id}">${post.title}</a></h3>
        <div class="post-meta">
          <span>📅 ${post.date}</span>
          <span>✍️ ${post.author}</span>
        </div>
        ${post.tags ? `
          <div class="post-tags">
            ${post.tags.map(tag => `<a href="/tag/${encodeURIComponent(tag)}" class="tag">${tag}</a>`).join(' ')}
          </div>
        ` : ''}
        <p>${post.excerpt.substring(0, 150)}...</p>
        <a href="/${post.id}" class="read-more">Read Article →</a>
      </article>
    `).join('')}
    ${getAdCode('posts_grid_ad') ? `<div class="posts-grid-ad">${getAdCode('posts_grid_ad')}</div>` : ''}
  </div>
`;

return new Response(HTML_TEMPLATE
  .replace('{{title}}', `${category} - ${BLOG_CONFIG.title}`)
  .replace('{{description}}', `Professional insights in ${category}`)
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

const content = `
  <div class="archive-header">
    <h1>Topic: ${tag}</h1>
    <p>Articles tagged with "${tag}"</p>
    ${getAdCode('archive_header_ad') ? `<div class="archive-header-ad">${getAdCode('archive_header_ad')}</div>` : ''}
  </div>

  <div class="posts-grid">
    ${tagPosts.map(post => `
      <article class="post-card">
        <h3><a href="/${post.id}">${post.title}</a></h3>
        <div class="post-meta">
          <span>📅 ${post.date}</span>
          <span>✍️ ${post.author}</span>
          ${post.category ? `<span>🏢 <a href="/category/${encodeURIComponent(post.category)}">${post.category}</a></span>` : ''}
        </div>
        <p>${post.excerpt.substring(0, 150)}...</p>
        <a href="/${post.id}" class="read-more">Read More →</a>
      </article>
    `).join('')}
    ${getAdCode('posts_grid_ad') ? `<div class="posts-grid-ad">${getAdCode('posts_grid_ad')}</div>` : ''}
  </div>
`;

return new Response(HTML_TEMPLATE
  .replace('{{title}}', `${tag} - ${BLOG_CONFIG.title}`)
  .replace('{{description}}', `Articles about ${tag}`)
  .replace('{{content}}', content)
  .replace('{{canonical_url}}', `https://${domain}/tag/${encodeURIComponent(tag)}`), {
  headers: { 'Content-Type': 'text/html' }
});
}

const HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
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
      * { margin: 0; padding: 0; box-sizing: border-box; }

      body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background: #f8f9fa;
      }

      .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }

      header {
          background: #2c3e50;
          color: white;
          padding: 1rem 0;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      }

      .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
      }

      .logo {
          font-size: 1.8rem;
          font-weight: bold;
      }

      .contact-info {
          display: flex;
          gap: 2rem;
          font-size: 0.9rem;
      }

      .contact-info span {
          display: flex;
          align-items: center;
          gap: 0.5rem;
      }

      main { max-width: 1200px; margin: 0 auto; padding: 2rem 20px; }

      .hero-section {
          background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
          color: white;
          text-align: center;
          padding: 4rem 2rem;
          border-radius: 10px;
          margin-bottom: 3rem;
      }

      .hero-content h1 {
          font-size: 3rem;
          margin-bottom: 1rem;
      }

      .hero-content p {
          font-size: 1.3rem;
          margin-bottom: 2rem;
          opacity: 0.9;
      }

      .cta-button {
          background: #e74c3c;
          color: white;
          padding: 1rem 2rem;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          transition: background 0.3s;
      }

      .cta-button:hover {
          background: #c0392b;
      }

      .categories-section {
          margin-bottom: 3rem;
      }

      .categories-section h2 {
          text-align: center;
          margin-bottom: 2rem;
          color: #2c3e50;
      }

      .categories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
      }

      .category-card {
          background: white;
          padding: 2rem;
          text-align: center;
          border-radius: 10px;
          text-decoration: none;
          color: #333;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          transition: transform 0.3s, box-shadow 0.3s;
      }

      .category-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15);
      }

      .category-card h3 {
          color: #2c3e50;
          margin-bottom: 0.5rem;
      }

      .posts-section h2 {
          text-align: center;
          margin-bottom: 2rem;
          color: #2c3e50;
      }

      .posts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 2rem;
      }

      .post-card {
          background: white;
          border-radius: 10px;
          padding: 2rem;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          transition: transform 0.3s;
      }

      .post-card:hover {
          transform: translateY(-3px);
      }

      .post-header h3 {
          margin-bottom: 1rem;
      }

      .post-header h3 a {
          color: #2c3e50;
          text-decoration: none;
          transition: color 0.3s;
      }

      .post-header h3 a:hover {
          color: #e74c3c;
      }

      .post-meta {
          color: #7f8c8d;
          font-size: 0.9rem;
          margin-bottom: 1rem;
      }

      .post-meta span {
          margin-right: 1rem;
      }

      .post-meta a {
          color: #3498db;
          text-decoration: none;
      }

      .post-tags {
          margin: 1rem 0;
      }

      .tag {
          background: #ecf0f1;
          color: #2c3e50;
          padding: 0.3rem 0.6rem;
          border-radius: 15px;
          text-decoration: none;
          font-size: 0.8rem;
          margin-right: 0.5rem;
          display: inline-block;
          margin-bottom: 0.5rem;
      }

      .tag:hover {
          background: #bdc3c7;
      }

      .post-excerpt {
          color: #555;
          line-height: 1.8;
          margin-bottom: 1rem;
      }

      .read-more {
          color: #e74c3c;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.3s;
      }

      .read-more:hover {
          color: #c0392b;
      }

      .single-post {
          background: white;
          border-radius: 10px;
          padding: 3rem;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          margin-bottom: 2rem;
      }

      .single-post .post-header {
          border-bottom: 2px solid #ecf0f1;
          padding-bottom: 2rem;
          margin-bottom: 2rem;
      }

      .single-post h1 {
          color: #2c3e50;
          margin-bottom: 1rem;
          font-size: 2.5rem;
      }

      .single-post .post-content {
          font-size: 1.1rem;
          line-height: 1.8;
          color: #444;
      }

      .contact-cta {
          background: #34495e;
          color: white;
          padding: 2rem;
          border-radius: 10px;
          text-align: center;
          margin-top: 3rem;
      }

      .contact-cta h3 {
          margin-bottom: 1rem;
      }

      .contact-cta p {
          margin-bottom: 1rem;
          opacity: 0.9;
      }

      .contact-cta .contact-info {
          display: flex;
          justify-content: center;
          gap: 2rem;
          flex-wrap: wrap;
      }

      .archive-header {
          background: white;
          padding: 3rem;
          text-align: center;
          border-radius: 10px;
          margin-bottom: 2rem;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      }

      .archive-header h1 {
          color: #2c3e50;
          margin-bottom: 1rem;
      }

      .archive-header p {
          color: #7f8c8d;
      }

      footer {
          background: #2c3e50;
          color: white;
          text-align: center;
          padding: 3rem 0;
          margin-top: 4rem;
      }

      @media (max-width: 768px) {
          .header-content {
              flex-direction: column;
              gap: 1rem;
          }

          .contact-info {
              flex-direction: column;
              gap: 0.5rem;
          }

          .hero-content h1 {
              font-size: 2rem;
          }

          .posts-grid {
              grid-template-columns: 1fr;
          }

          .categories-grid {
              grid-template-columns: 1fr;
          }
      }
  </style>
</head>
<body>
  <header>
      <div class="container">
          <div class="header-content">
              <div class="logo">${BLOG_CONFIG.title}</div>
              <div class="contact-info">
                  <span>📞 ${BLOG_CONFIG.phone}</span>
                  <span>📧 ${BLOG_CONFIG.email}</span>
              </div>
          </div>
      </div>
      ${getAdCode('header_ad') ? `<div class="header-ad">${getAdCode('header_ad')}</div>` : ''}
  </header>

  <main>
      {{content}}
  </main>

  <footer>
      <div class="container">
          <p>&copy; 2024 ${BLOG_CONFIG.title}. Professional insights for business growth.</p>
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
