
// Business Blog Template - SEO Optimized & Fast Responsive
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
  } else if (path === '/robots.txt') {
    return getRobotsTxt(request.url)
  } else {
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
  title: "Business Solutions Blog",
  subtitle: "Expert Insights & Business Growth Strategies",
  author: "Business Team",
  description: "Professional business blog with expert insights, growth strategies, and industry analysis",
  keywords: "business, consulting, growth, strategy, insights",
  domain: "example.com"
};

function getRobotsTxt(currentDomain) {
  const domain = new URL(currentDomain).hostname || BLOG_CONFIG.domain;
  
  const robotsTxt = `User-agent: *
Allow: /

Sitemap: https://${domain}/sitemap.xml`;

  return new Response(robotsTxt, {
    headers: { 'Content-Type': 'text/plain' }
  });
}

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
  <language>en-US</language>
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

  const categories = [...new Set(posts.map(p => p.category).filter(Boolean))];
  categories.forEach(category => {
    urls.push({
      loc: `https://${domain}/category/${encodeURIComponent(category)}`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: '0.8'
    });
  });

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
  const featuredPosts = posts.slice(0, 3);
  const recentPosts = posts.slice(3, 9);
  const categories = [...new Set(posts.map(p => p.category).filter(Boolean))];

  const content = `
    <div class="hero-banner">
      <div class="hero-content">
        <h1>Transform Your Business Today</h1>
        <p>Expert insights and proven strategies to accelerate your business growth</p>
        <a href="#services" class="cta-primary">Get Started</a>
        ${getAdCode('hero_banner_ad') ? `<div class="hero-banner-ad">${getAdCode('hero_banner_ad')}</div>` : ''}
      </div>
    </div>

    <section id="services" class="services-section">
      <h2>Our Expertise</h2>
      <div class="services-grid">
        ${categories.map(cat => `
          <div class="service-card">
            <h3>${cat}</h3>
            <p>Professional ${cat.toLowerCase()} solutions for your business</p>
            <a href="/category/${encodeURIComponent(cat)}" class="service-link">Learn More →</a>
          </div>
        `).join('')}
        ${getAdCode('services_grid_ad') ? `<div class="services-grid-ad">${getAdCode('services_grid_ad')}</div>` : ''}
      </div>
    </section>

    <section class="featured-section">
      <h2>Featured Insights</h2>
      <div class="featured-grid">
        ${featuredPosts.map(post => `
          <article class="featured-card">
            <h3><a href="/${post.id}">${post.title}</a></h3>
            <div class="post-meta">
              <time datetime="${post.date}">📅 ${post.date}</time>
              <span>👤 ${post.author}</span>
            </div>
            <p>${post.excerpt}</p>
            <a href="/${post.id}" class="read-more">Read Full Article</a>
          </article>
        `).join('')}
        ${getAdCode('featured_grid_ad') ? `<div class="featured-grid-ad">${getAdCode('featured_grid_ad')}</div>` : ''}
      </div>
    </section>

    <section class="recent-section">
      <h2>Latest Articles</h2>
      <div class="articles-grid">
        ${recentPosts.map(post => `
          <article class="article-card">
            <h4><a href="/${post.id}">${post.title}</a></h4>
            <div class="article-meta">
              <time datetime="${post.date}">${post.date}</time>
              ${post.category ? `<span class="category">${post.category}</span>` : ''}
            </div>
            <p>${post.excerpt.substring(0, 120)}...</p>
          </article>
        `).join('')}
        ${getAdCode('articles_grid_ad') ? `<div class="articles-grid-ad">${getAdCode('articles_grid_ad')}</div>` : ''}
      </div>
    </section>
  `;

  return new Response(HTML_TEMPLATE
    .replace('{{title}}', BLOG_CONFIG.title)
    .replace('{{description}}', BLOG_CONFIG.description)
    .replace('{{keywords}}', BLOG_CONFIG.keywords)
    .replace('{{content}}', content)
    .replace('{{canonical_url}}', `https://${domain}`), {
    headers: { 
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}

function getPostPage(postId, currentDomain) {
  const domain = new URL(currentDomain).hostname || BLOG_CONFIG.domain;
  const post = posts.find(p => p.id === postId);
  if (!post) {
    return new Response('Post not found', { status: 404 });
  }

  const content = `
    <article class="single-post" itemscope itemtype="http://schema.org/BlogPosting">
      <header class="post-header">
        <h1 itemprop="headline">${post.title}</h1>
        <div class="post-meta">
          <time datetime="${post.date}" itemprop="datePublished">📅 ${post.date}</time>
          <span itemprop="author" itemscope itemtype="http://schema.org/Person">
            👤 <span itemprop="name">${post.author}</span>
          </span>
          ${post.category ? `<span itemprop="about">${post.category}</span>` : ''}
        </div>
        ${post.tags ? `
          <div class="post-tags">
            ${post.tags.map(tag => `<a href="/tag/${encodeURIComponent(tag)}" class="tag" itemprop="keywords">${tag}</a>`).join(' ')}
          </div>
        ` : ''}
      </header>
      <div class="post-content" itemprop="articleBody">${post.content}</div>
      ${getAdCode('post_content_ad') ? `<div class="post-content-ad">${getAdCode('post_content_ad')}</div>` : ''}
      
      <div class="contact-section">
        <h3>Need Professional Consultation?</h3>
        <p>Ready to implement these strategies in your business? Contact our experts today.</p>
        <a href="#contact" class="contact-btn">Get Free Consultation</a>
      </div>
    </article>
  `;

  return new Response(HTML_TEMPLATE
    .replace('{{title}}', `${post.title} - ${BLOG_CONFIG.title}`)
    .replace('{{description}}', post.excerpt)
    .replace('{{keywords}}', `${post.tags ? post.tags.join(', ') : ''}, ${BLOG_CONFIG.keywords}`)
    .replace('{{content}}', content)
    .replace('{{canonical_url}}', `https://${domain}/${postId}`), {
    headers: { 
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}

function getCategoryPage(category, currentDomain) {
  const domain = new URL(currentDomain).hostname || BLOG_CONFIG.domain;
  const categoryPosts = posts.filter(post => 
    post.category && post.category.toLowerCase() === category.toLowerCase()
  );

  const content = `
    <div class="archive-header">
      <h1>${category} Solutions</h1>
      <p>Comprehensive ${category.toLowerCase()} strategies and insights for business growth</p>
      ${getAdCode('archive_header_ad') ? `<div class="archive-header-ad">${getAdCode('archive_header_ad')}</div>` : ''}
    </div>

    <div class="posts-grid">
      ${categoryPosts.map(post => `
        <article class="post-card">
          <h3><a href="/${post.id}">${post.title}</a></h3>
          <div class="post-meta">
            <time datetime="${post.date}">📅 ${post.date}</time>
            <span>👤 ${post.author}</span>
          </div>
          <p>${post.excerpt.substring(0, 150)}...</p>
          <a href="/${post.id}" class="read-more">Read More →</a>
        </article>
      `).join('')}
      ${getAdCode('posts_grid_ad') ? `<div class="posts-grid-ad">${getAdCode('posts_grid_ad')}</div>` : ''}
    </div>
  `;

  return new Response(HTML_TEMPLATE
    .replace('{{title}}', `${category} Solutions - ${BLOG_CONFIG.title}`)
    .replace('{{description}}', `Professional ${category.toLowerCase()} solutions and strategies`)
    .replace('{{keywords}}', `${category}, business, consulting, ${BLOG_CONFIG.keywords}`)
    .replace('{{content}}', content)
    .replace('{{canonical_url}}', `https://${domain}/category/${encodeURIComponent(category)}`), {
    headers: { 
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}

function getTagPage(tag, currentDomain) {
  const domain = new URL(currentDomain).hostname || BLOG_CONFIG.domain;
  const tagPosts = posts.filter(post => 
    post.tags && post.tags.some(t => t.toLowerCase() === tag.toLowerCase())
  );

  const content = `
    <div class="archive-header">
      <h1>${tag} Resources</h1>
      <p>Articles and insights about ${tag.toLowerCase()}</p>
      ${getAdCode('archive_header_ad') ? `<div class="archive-header-ad">${getAdCode('archive_header_ad')}</div>` : ''}
    </div>

    <div class="posts-grid">
      ${tagPosts.map(post => `
        <article class="post-card">
          <h3><a href="/${post.id}">${post.title}</a></h3>
          <div class="post-meta">
            <time datetime="${post.date}">📅 ${post.date}</time>
            <span>👤 ${post.author}</span>
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
    .replace('{{description}}', `Resources and articles about ${tag}`)
    .replace('{{keywords}}', `${tag}, ${BLOG_CONFIG.keywords}`)
    .replace('{{content}}', content)
    .replace('{{canonical_url}}', `https://${domain}/tag/${encodeURIComponent(tag)}`), {
    headers: { 
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=3600'
    }
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
  <meta name="keywords" content="{{keywords}}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="{{canonical_url}}">
  <link rel="alternate" type="application/rss+xml" title="${BLOG_CONFIG.title} RSS" href="/feed.xml">
  
  <!-- Open Graph -->
  <meta property="og:title" content="{{title}}">
  <meta property="og:description" content="{{description}}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="{{canonical_url}}">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="{{title}}">
  <meta name="twitter:description" content="{{description}}">
  
  <!-- JSON-LD Schema -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "${BLOG_CONFIG.title}",
    "description": "${BLOG_CONFIG.description}",
    "url": "{{canonical_url}}"
  }
  </script>
  
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #2d3748;
      background: #f7fafc;
    }
    
    .container { max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
    
    header {
      background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);
      color: white;
      padding: 1rem 0;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .logo { font-size: 1.5rem; font-weight: 700; }
    
    nav ul {
      display: flex;
      list-style: none;
      gap: 2rem;
    }
    
    nav a {
      color: white;
      text-decoration: none;
      font-weight: 500;
      transition: opacity 0.3s;
    }
    
    nav a:hover { opacity: 0.8; }
    
    .hero-banner {
      background: linear-gradient(135deg, #2b6cb0 0%, #3182ce 100%);
      color: white;
      padding: 4rem 0;
      text-align: center;
    }
    
    .hero-content h1 {
      font-size: 3rem;
      font-weight: 800;
      margin-bottom: 1rem;
    }
    
    .hero-content p {
      font-size: 1.25rem;
      margin-bottom: 2rem;
      opacity: 0.9;
    }
    
    .cta-primary {
      background: #e53e3e;
      color: white;
      padding: 1rem 2rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      transition: background 0.3s;
    }
    
    .cta-primary:hover { background: #c53030; }
    
    .services-section, .featured-section, .recent-section {
      padding: 4rem 0;
    }
    
    .services-section h2, .featured-section h2, .recent-section h2 {
      text-align: center;
      font-size: 2.5rem;
      margin-bottom: 3rem;
      color: #1a365d;
    }
    
    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
    }
    
    .service-card {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      text-align: center;
      transition: transform 0.3s;
    }
    
    .service-card:hover { transform: translateY(-5px); }
    
    .service-card h3 {
      color: #2d3748;
      margin-bottom: 1rem;
    }
    
    .service-link {
      color: #3182ce;
      text-decoration: none;
      font-weight: 600;
    }
    
    .featured-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 2rem;
    }
    
    .featured-card {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .featured-card h3 a {
      color: #1a365d;
      text-decoration: none;
      font-size: 1.25rem;
    }
    
    .post-meta {
      color: #718096;
      font-size: 0.9rem;
      margin: 1rem 0;
    }
    
    .read-more {
      color: #3182ce;
      text-decoration: none;
      font-weight: 600;
    }
    
    .articles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
    }
    
    .article-card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .single-post {
      background: white;
      padding: 3rem;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      max-width: 800px;
      margin: 2rem auto;
    }
    
    .post-header h1 {
      font-size: 2.5rem;
      color: #1a365d;
      margin-bottom: 1rem;
    }
    
    .post-content {
      font-size: 1.1rem;
      line-height: 1.8;
      margin: 2rem 0;
    }
    
    .tag {
      background: #e2e8f0;
      color: #4a5568;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      text-decoration: none;
      font-size: 0.8rem;
      margin-right: 0.5rem;
    }
    
    .contact-section {
      background: #f7fafc;
      padding: 2rem;
      border-radius: 8px;
      text-align: center;
      margin-top: 3rem;
    }
    
    .contact-btn {
      background: #38a169;
      color: white;
      padding: 1rem 2rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      margin-top: 1rem;
      display: inline-block;
    }
    
    .archive-header {
      background: white;
      padding: 3rem;
      text-align: center;
      border-radius: 12px;
      margin-bottom: 3rem;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .posts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 2rem;
    }
    
    .post-card {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    footer {
      background: #1a365d;
      color: white;
      padding: 3rem 0;
      text-align: center;
      margin-top: 4rem;
    }
    
    @media (max-width: 768px) {
      .hero-content h1 { font-size: 2rem; }
      .header-content { flex-direction: column; gap: 1rem; }
      nav ul { flex-direction: column; gap: 1rem; }
      .services-grid, .featured-grid, .articles-grid, .posts-grid {
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
        <nav>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/category/consulting">Consulting</a></li>
            <li><a href="/category/strategy">Strategy</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </nav>
      </div>
    </div>
    ${getAdCode('header_ad') ? `<div class="header-ad">${getAdCode('header_ad')}</div>` : ''}
  </header>

  <main>
    <div class="container">
      {{content}}
    </div>
  </main>

  <footer>
    <div class="container">
      <p>&copy; 2024 ${BLOG_CONFIG.title}. Professional business consulting and insights.</p>
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
