
// Magazine Style Blog Template
addEventListener('fetch', event => {
event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
const url = new URL(request.url)
const path = url.pathname

if (path === '/') {
  return getHomePage(request.url)
} else if (path.startsWith('/')) {
  const postId = path.split('/')[2]
  return getPostPage(postId, request.url)
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
title: "News Magazine",
subtitle: "Portal Berita dan Informasi Terkini",
author: "News Team",
description: "Portal berita dengan gaya magazine modern",
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
const latestPost = posts[0];
const otherPosts = posts.slice(1);

// Breaking news ticker
const breakingNews = posts.slice(0, 3).map(post => 
  `<span class="breaking-item">${post.title}</span>`
).join('');

// Categories with post counts
const categories = [...new Set(posts.map(p => p.category).filter(Boolean))];
const categoryMenu = categories.map(cat => `
  <a href="/category/${encodeURIComponent(cat)}" class="category-link">
    ${cat} (${posts.filter(p => p.category === cat).length})
  </a>
`).join('');

const content = `
  <div class="breaking-news">
    <span class="breaking-label">BREAKING:</span>
    <div class="breaking-content">${breakingNews}</div>
    ${getAdCode('breaking_news_ad') ? `<div class="breaking-news-ad">${getAdCode('breaking_news_ad')}</div>` : ''}
  </div>

  <div class="category-menu">
    ${categoryMenu}
    ${getAdCode('category_menu_ad') ? `<div class="category-menu-ad">${getAdCode('category_menu_ad')}</div>` : ''}
  </div>

  <div class="featured-section">
    ${latestPost ? `
      <div class="featured-post">
        <h2><a href="/${latestPost.id}">${latestPost.title}</a></h2>
        <div class="post-meta">
          <span>&#128197; ${latestPost.date}</span>
          <span>&#9997; ${latestPost.author}</span>
          ${latestPost.category ? `<span>&#127991; ${latestPost.category}</span>` : ''}
        </div>
        ${latestPost.tags ? `
          <div class="post-tags">
            ${latestPost.tags.map(tag => `<span class="tag">#${tag}</span>`).join(' ')}
          </div>
        ` : ''}
        <div class="post-excerpt">${latestPost.excerpt}</div>
        <a href="/${latestPost.id}" class="btn-primary">Baca Selengkapnya</a>
        ${getAdCode('featured_post_ad') ? `<div class="featured-post-ad">${getAdCode('featured_post_ad')}</div>` : ''}
      </div>
    ` : ''}
  </div>

  <div class="posts-grid">
    ${otherPosts.map(post => `
      <article class="post-card">
        <h3><a href="/${post.id}">${post.title}</a></h3>
        <div class="post-meta">
          <span>&#128197; ${post.date}</span>
          ${post.category ? `<span>&#127991; <a href="/category/${encodeURIComponent(post.category)}">${post.category}</a></span>` : ''}
        </div>
        <p>${post.excerpt.substring(0, 150)}...</p>
      </article>
    `).join('')}
    ${getAdCode('posts_grid_ad') ? `<div class="posts-grid-ad">${getAdCode('posts_grid_ad')}</div>` : ''}
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
    <h1>${post.title}</h1>
    <div class="post-meta">
      <span>&#128197; ${post.date}</span>
      <span>&#9997; ${post.author}</span>
      ${post.category ? `<span>&#127991; <a href="/category/${encodeURIComponent(post.category)}">${post.category}</a></span>` : ''}
    </div>
    ${post.tags ? `
      <div class="post-tags">
        ${post.tags.map(tag => `<a href="/tag/${encodeURIComponent(tag)}" class="tag">#${tag}</a>`).join(' ')}
      </div>
    ` : ''}
    <div class="post-content">${post.content}</div>
    ${getAdCode('post_content_ad') ? `<div class="post-content-ad">${getAdCode('post_content_ad')}</div>` : ''}
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
    <h1>Kategori: ${category}</h1>
    <p>${categoryPosts.length} artikel ditemukan</p>
    ${getAdCode('archive_header_ad') ? `<div class="archive-header-ad">${getAdCode('archive_header_ad')}</div>` : ''}
  </div>

  <div class="posts-grid">
    ${categoryPosts.map(post => `
      <article class="post-card">
        <h3><a href="/${post.id}">${post.title}</a></h3>
        <div class="post-meta">
          <span>&#128197; ${post.date}</span>
          <span>&#9997; ${post.author}</span>
        </div>
        ${post.tags ? `
          <div class="post-tags">
            ${post.tags.map(tag => `<a href="/tag/${encodeURIComponent(tag)}" class="tag">#${tag}</a>`).join(' ')}
          </div>
        ` : ''}
        <p>${post.excerpt.substring(0, 150)}...</p>
        <a href="/${post.id}" class="read-more">Baca →</a>
      </article>
    `).join('')}
    ${getAdCode('posts_grid_ad') ? `<div class="posts-grid-ad">${getAdCode('posts_grid_ad')}</div>` : ''}
  </div>
`;

return new Response(HTML_TEMPLATE
  .replace('{{title}}', `Kategori ${category} - ${BLOG_CONFIG.title}`)
  .replace('{{description}}', `Artikel dalam kategori ${category}`)
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
    <h1>Tag: #${tag}</h1>
    <p>${tagPosts.length} artikel dengan tag ini</p>
    ${getAdCode('archive_header_ad') ? `<div class="archive-header-ad">${getAdCode('archive_header_ad')}</div>` : ''}
  </div>

  <div class="posts-grid">
    ${tagPosts.map(post => `
      <article class="post-card">
        <h3><a href="/${post.id}">${post.title}</a></h3>
        <div class="post-meta">
          <span>&#128197; ${post.date}</span>
          <span>&#9997; ${post.author}</span>
          ${post.category ? `<span>&#127991; <a href="/category/${encodeURIComponent(post.category)}">${post.category}</a></span>` : ''}
        </div>
        <p>${post.excerpt.substring(0, 150)}...</p>
        <a href="/${post.id}" class="read-more">Baca →</a>
      </article>
    `).join('')}
    ${getAdCode('posts_grid_ad') ? `<div class="posts-grid-ad">${getAdCode('posts_grid_ad')}</div>` : ''}
  </div>
`;

return new Response(HTML_TEMPLATE
  .replace('{{title}}', `Tag ${tag} - ${BLOG_CONFIG.title}`)
  .replace('{{description}}', `Artikel dengan tag ${tag}`)
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
      * { margin: 0; padding: 0; box-sizing: border-box; }

      body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          background: #f4f4f4;
      }

      .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }

      header {
          background: #1a237e;
          color: white;
          padding: 1rem 0;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      }

      .logo {
          font-size: 2rem;
          font-weight: bold;
          text-align: center;
      }

      .breaking-news {
          background: #d32f2f;
          color: white;
          padding: 0.5rem;
          overflow: hidden;
          white-space: nowrap;
      }

      .breaking-label {
          background: white;
          color: #d32f2f;
          padding: 0.2rem 0.5rem;
          font-weight: bold;
          margin-right: 1rem;
      }

      .breaking-content {
          display: inline-block;
          animation: scroll 30s linear infinite;
      }

      @keyframes scroll {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
      }

      .category-menu {
          background: white;
          padding: 1rem;
          text-align: center;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      }

      .category-link {
          display: inline-block;
          background: #3f51b5;
          color: white;
          padding: 0.5rem 1rem;
          margin: 0.2rem;
          text-decoration: none;
          border-radius: 20px;
          transition: background 0.3s;
      }

      .category-link:hover {
          background: #1a237e;
      }

      main {
          max-width: 1200px;
          margin: 2rem auto;
          padding: 0 20px;
      }

      .featured-section {
          background: white;
          padding: 2rem;
          margin-bottom: 2rem;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      }

      .featured-post h2 {
          font-size: 2rem;
          margin-bottom: 1rem;
      }

      .featured-post h2 a {
          color: #1a237e;
          text-decoration: none;
      }

      .post-meta {
          color: #666;
          margin-bottom: 1rem;
      }

      .post-meta span {
          margin-right: 1rem;
      }

      .post-meta a {
          color: #3f51b5;
          text-decoration: none;
      }

      .post-tags {
          margin: 1rem 0;
      }

      .tag {
          background: #e8eaf6;
          color: #3f51b5;
          padding: 0.2rem 0.5rem;
          border-radius: 15px;
          text-decoration: none;
          font-size: 0.8rem;
          margin-right: 0.5rem;
          display: inline-block;
      }

      .tag:hover {
          background: #c5cae9;
      }

      .btn-primary {
          background: #3f51b5;
          color: white;
          padding: 0.7rem 1.5rem;
          text-decoration: none;
          border-radius: 5px;
          display: inline-block;
          margin-top: 1rem;
      }

      .btn-primary:hover {
          background: #1a237e;
      }

      .posts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
      }

      .post-card {
          background: white;
          padding: 1.5rem;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          transition: transform 0.3s;
      }

      .post-card:hover {
          transform: translateY(-5px);
      }

      .post-card h3 {
          margin-bottom: 1rem;
      }

      .post-card h3 a {
          color: #1a237e;
          text-decoration: none;
      }

      .post-card h3 a:hover {
          color: #3f51b5;
      }

      .read-more {
          color: #3f51b5;
          text-decoration: none;
          font-weight: bold;
      }

      .single-post {
          background: white;
          padding: 2rem;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      }

      .single-post h1 {
          color: #1a237e;
          margin-bottom: 1rem;
      }

      .single-post .post-content {
          font-size: 1.1rem;
          line-height: 1.8;
          margin-top: 2rem;
      }

      .archive-header {
          background: white;
          padding: 2rem;
          text-align: center;
          border-radius: 10px;
          margin-bottom: 2rem;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      }

      .archive-header h1 {
          color: #1a237e;
          margin-bottom: 0.5rem;
      }

      footer {
          background: #1a237e;
          color: white;
          text-align: center;
          padding: 2rem 0;
          margin-top: 4rem;
      }

      @media (max-width: 768px) {
          .posts-grid {
              grid-template-columns: 1fr;
          }

          .featured-post h2 {
              font-size: 1.5rem;
          }
      }
  </style>
</head>
<body>
  <header>
      <div class="container">
          <div class="logo">${BLOG_CONFIG.title}</div>
      </div>
  </header>

  <main>
      {{content}}
  </main>

  <footer>
      <div class="container">
          <p>&copy; 2024 ${BLOG_CONFIG.title}. Portal berita dan informasi terpercaya.</p>
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
