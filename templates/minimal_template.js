
// Minimal Portfolio Template - Ultra Clean & SEO Optimized
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const path = url.pathname

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
  title: "Minimal Portfolio",
  subtitle: "Clean & Simple Design Blog",
  author: "Creative Author",
  description: "A minimal portfolio blog showcasing clean design, typography, and creative content",
  keywords: "design, portfolio, minimal, creative, writing, blog",
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
  const recentPosts = posts.slice(0, 10);
  const categories = [...new Set(posts.map(p => p.category).filter(Boolean))];

  const content = `
    <section class="intro-section">
      <div class="intro-content">
        <h1>Welcome to ${BLOG_CONFIG.title}</h1>
        <p class="intro-text">${BLOG_CONFIG.subtitle}</p>
        <p class="intro-description">A curated collection of thoughts, ideas, and creative expressions</p>
        ${getAdCode('intro_section_ad') ? `<div class="intro-section-ad">${getAdCode('intro_section_ad')}</div>` : ''}
      </div>
    </section>

    <section class="categories-section">
      <h2>Explore Topics</h2>
      <div class="categories-list">
        ${categories.map(cat => `
          <a href="/category/${encodeURIComponent(cat)}" class="category-link">
            ${cat} <span class="count">(${posts.filter(p => p.category === cat).length})</span>
          </a>
        `).join('')}
        ${getAdCode('categories_section_ad') ? `<div class="categories-section-ad">${getAdCode('categories_section_ad')}</div>` : ''}
      </div>
    </section>

    <section class="posts-section">
      <h2>Recent Writing</h2>
      <div class="posts-list">
        ${recentPosts.map(post => `
          <article class="post-item" itemscope itemtype="http://schema.org/BlogPosting">
            <header class="post-header">
              <h3 itemprop="headline"><a href="/${post.id}">${post.title}</a></h3>
              <div class="post-meta">
                <time datetime="${post.date}" itemprop="datePublished">${formatDate(post.date)}</time>
                ${post.category ? `<span class="category" itemprop="about">${post.category}</span>` : ''}
              </div>
            </header>
            <div class="post-excerpt" itemprop="description">${post.excerpt}</div>
            ${post.tags ? `
              <div class="post-tags">
                ${post.tags.slice(0, 3).map(tag => `<span class="tag" itemprop="keywords">${tag}</span>`).join('')}
              </div>
            ` : ''}
            <a href="/${post.id}" class="continue-reading">Continue reading →</a>
          </article>
        `).join('')}
        ${getAdCode('posts_section_ad') ? `<div class="posts-section-ad">${getAdCode('posts_section_ad')}</div>` : ''}
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

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
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
          <time datetime="${post.date}" itemprop="datePublished">${formatDate(post.date)}</time>
          <span itemprop="author" itemscope itemtype="http://schema.org/Person">
            By <span itemprop="name">${post.author}</span>
          </span>
          ${post.category ? `<span class="category" itemprop="about">${post.category}</span>` : ''}
        </div>
        ${post.tags ? `
          <div class="post-tags">
            ${post.tags.map(tag => `<a href="/tag/${encodeURIComponent(tag)}" class="tag" itemprop="keywords">${tag}</a>`).join('')}
          </div>
        ` : ''}
      </header>

      <div class="post-content" itemprop="articleBody">${post.content}</div>
      ${getAdCode('post_content_ad') ? `<div class="post-content-ad">${getAdCode('post_content_ad')}</div>` : ''}
      
      <footer class="post-footer">
        <div class="post-navigation">
          <a href="/" class="back-link">← Back to all posts</a>
        </div>
        
        <div class="share-section">
          <p>Share this post:</p>
          <div class="share-links">
            <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`https://${domain}/${post.id}`)}" target="_blank" rel="noopener">Twitter</a>
            <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://${domain}/${post.id}`)}" target="_blank" rel="noopener">LinkedIn</a>
            <a href="mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(`https://${domain}/${post.id}`)}" target="_blank">Email</a>
          </div>
        </div>
      </footer>
    </article>
  `;

  return new Response(HTML_TEMPLATE
    .replace('{{title}}', `${post.title} — ${BLOG_CONFIG.title}`)
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
      <h1>Category: ${category}</h1>
      <p>All posts in "${category}" category</p>
      ${getAdCode('archive_header_ad') ? `<div class="archive-header-ad">${getAdCode('archive_header_ad')}</div>` : ''}
    </div>

    <div class="archive-posts">
      ${categoryPosts.map(post => `
        <article class="archive-item">
          <h2><a href="/${post.id}">${post.title}</a></h2>
          <div class="archive-meta">
            <time datetime="${post.date}">${formatDate(post.date)}</time>
            <span>By ${post.author}</span>
          </div>
          <p class="archive-excerpt">${post.excerpt}</p>
          ${post.tags ? `
            <div class="archive-tags">
              ${post.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
          ` : ''}
        </article>
      `).join('')}
      ${getAdCode('archive_posts_ad') ? `<div class="archive-posts-ad">${getAdCode('archive_posts_ad')}</div>` : ''}
    </div>
  `;

  return new Response(HTML_TEMPLATE
    .replace('{{title}}', `${category} — ${BLOG_CONFIG.title}`)
    .replace('{{description}}', `Posts about ${category.toLowerCase()}`)
    .replace('{{keywords}}', `${category}, ${BLOG_CONFIG.keywords}`)
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
      <h1>Tag: ${tag}</h1>
      <p>All posts tagged with "${tag}"</p>
      ${getAdCode('archive_header_ad') ? `<div class="archive-header-ad">${getAdCode('archive_header_ad')}</div>` : ''}
    </div>

    <div class="archive-posts">
      ${tagPosts.map(post => `
        <article class="archive-item">
          <h2><a href="/${post.id}">${post.title}</a></h2>
          <div class="archive-meta">
            <time datetime="${post.date}">${formatDate(post.date)}</time>
            <span>By ${post.author}</span>
            ${post.category ? `<span class="category">${post.category}</span>` : ''}
          </div>
          <p class="archive-excerpt">${post.excerpt}</p>
        </article>
      `).join('')}
      ${getAdCode('archive_posts_ad') ? `<div class="archive-posts-ad">${getAdCode('archive_posts_ad')}</div>` : ''}
    </div>
  `;

  return new Response(HTML_TEMPLATE
    .replace('{{title}}', `${tag} — ${BLOG_CONFIG.title}`)
    .replace('{{description}}', `Posts tagged with ${tag}`)
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
    "@type": "Blog",
    "name": "${BLOG_CONFIG.title}",
    "description": "${BLOG_CONFIG.description}",
    "url": "{{canonical_url}}",
    "author": {
      "@type": "Person",
      "name": "${BLOG_CONFIG.author}"
    }
  }
  </script>
  
  <style>
    :root {
      --text-primary: #1a1a1a;
      --text-secondary: #666666;
      --text-muted: #999999;
      --background: #ffffff;
      --background-alt: #fafafa;
      --border: #e6e6e6;
      --accent: #000000;
      --link: #0066cc;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    html {
      scroll-behavior: smooth;
    }
    
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      line-height: 1.7;
      color: var(--text-primary);
      background: var(--background);
      font-size: 18px;
    }
    
    .container {
      max-width: 680px;
      margin: 0 auto;
      padding: 0 2rem;
    }
    
    header {
      padding: 3rem 0 2rem 0;
      border-bottom: 1px solid var(--border);
      margin-bottom: 3rem;
    }
    
    .site-header {
      text-align: center;
    }
    
    .site-title {
      font-size: 2rem;
      font-weight: 400;
      margin-bottom: 0.5rem;
    }
    
    .site-title a {
      color: var(--text-primary);
      text-decoration: none;
    }
    
    .site-subtitle {
      color: var(--text-secondary);
      font-size: 1rem;
      font-style: italic;
    }
    
    nav {
      margin-top: 2rem;
    }
    
    nav ul {
      list-style: none;
      display: flex;
      justify-content: center;
      gap: 2rem;
    }
    
    nav a {
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.9rem;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      transition: color 0.3s ease;
    }
    
    nav a:hover {
      color: var(--text-primary);
    }
    
    .intro-section {
      text-align: center;
      margin-bottom: 4rem;
    }
    
    .intro-content h1 {
      font-size: 2.5rem;
      font-weight: 300;
      margin-bottom: 1rem;
      line-height: 1.2;
    }
    
    .intro-text {
      font-size: 1.25rem;
      color: var(--text-secondary);
      margin-bottom: 1rem;
    }
    
    .intro-description {
      color: var(--text-muted);
      font-size: 1rem;
      max-width: 500px;
      margin: 0 auto;
    }
    
    .categories-section {
      margin-bottom: 4rem;
      text-align: center;
    }
    
    .categories-section h2 {
      font-size: 1.5rem;
      font-weight: 300;
      margin-bottom: 2rem;
      color: var(--text-primary);
    }
    
    .categories-list {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    
    .category-link {
      color: var(--text-secondary);
      text-decoration: none;
      padding: 0.5rem 1rem;
      border: 1px solid var(--border);
      border-radius: 25px;
      font-size: 0.9rem;
      transition: all 0.3s ease;
      background: var(--background-alt);
    }
    
    .category-link:hover {
      color: var(--text-primary);
      border-color: var(--accent);
    }
    
    .count {
      color: var(--text-muted);
      font-size: 0.8rem;
    }
    
    .posts-section h2 {
      font-size: 1.5rem;
      font-weight: 300;
      margin-bottom: 3rem;
      color: var(--text-primary);
      text-align: center;
    }
    
    .posts-list {
      display: flex;
      flex-direction: column;
      gap: 3rem;
    }
    
    .post-item {
      border-bottom: 1px solid var(--border);
      padding-bottom: 2rem;
    }
    
    .post-item:last-child {
      border-bottom: none;
    }
    
    .post-header h3 {
      font-size: 1.75rem;
      font-weight: 400;
      margin-bottom: 0.75rem;
      line-height: 1.3;
    }
    
    .post-header h3 a {
      color: var(--text-primary);
      text-decoration: none;
      transition: color 0.3s ease;
    }
    
    .post-header h3 a:hover {
      color: var(--link);
    }
    
    .post-meta {
      color: var(--text-muted);
      font-size: 0.9rem;
      margin-bottom: 1rem;
      display: flex;
      gap: 1rem;
      align-items: center;
    }
    
    .category {
      background: var(--background-alt);
      padding: 0.2rem 0.6rem;
      border-radius: 12px;
      font-size: 0.8rem;
    }
    
    .post-excerpt {
      color: var(--text-secondary);
      margin-bottom: 1rem;
      line-height: 1.6;
    }
    
    .post-tags {
      margin-bottom: 1rem;
    }
    
    .tag {
      background: var(--background-alt);
      color: var(--text-muted);
      padding: 0.2rem 0.6rem;
      border-radius: 12px;
      font-size: 0.8rem;
      margin-right: 0.5rem;
      text-decoration: none;
      display: inline-block;
    }
    
    .tag:hover {
      color: var(--text-primary);
    }
    
    .continue-reading {
      color: var(--link);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      transition: color 0.3s ease;
    }
    
    .continue-reading:hover {
      text-decoration: underline;
    }
    
    .single-post {
      margin-bottom: 4rem;
    }
    
    .single-post .post-header {
      text-align: center;
      margin-bottom: 3rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid var(--border);
    }
    
    .single-post .post-header h1 {
      font-size: 2.5rem;
      font-weight: 400;
      margin-bottom: 1rem;
      line-height: 1.2;
    }
    
    .single-post .post-meta {
      justify-content: center;
    }
    
    .post-content {
      font-size: 1.1rem;
      line-height: 1.8;
      margin-bottom: 3rem;
    }
    
    .post-content h2 {
      font-size: 1.75rem;
      font-weight: 400;
      margin: 2.5rem 0 1rem 0;
      color: var(--text-primary);
    }
    
    .post-content h3 {
      font-size: 1.5rem;
      font-weight: 400;
      margin: 2rem 0 1rem 0;
      color: var(--text-primary);
    }
    
    .post-content p {
      margin-bottom: 1.5rem;
    }
    
    .post-content blockquote {
      border-left: 3px solid var(--border);
      padding-left: 1.5rem;
      margin: 2rem 0;
      font-style: italic;
      color: var(--text-secondary);
    }
    
    .post-content ul, .post-content ol {
      margin: 1.5rem 0;
      padding-left: 2rem;
    }
    
    .post-content li {
      margin-bottom: 0.5rem;
    }
    
    .post-content pre {
      background: var(--background-alt);
      padding: 1.5rem;
      border-radius: 8px;
      overflow-x: auto;
      margin: 2rem 0;
      font-size: 0.9rem;
    }
    
    .post-content code {
      background: var(--background-alt);
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 0.9rem;
    }
    
    .post-content img {
      max-width: 100%;
      height: auto;
      margin: 2rem 0;
      border-radius: 8px;
    }
    
    .post-footer {
      border-top: 1px solid var(--border);
      padding-top: 2rem;
      margin-top: 3rem;
    }
    
    .post-navigation {
      margin-bottom: 2rem;
    }
    
    .back-link {
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.9rem;
      transition: color 0.3s ease;
    }
    
    .back-link:hover {
      color: var(--text-primary);
    }
    
    .share-section {
      text-align: center;
    }
    
    .share-section p {
      color: var(--text-muted);
      font-size: 0.9rem;
      margin-bottom: 1rem;
    }
    
    .share-links {
      display: flex;
      justify-content: center;
      gap: 1rem;
    }
    
    .share-links a {
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.9rem;
      padding: 0.5rem 1rem;
      border: 1px solid var(--border);
      border-radius: 20px;
      transition: all 0.3s ease;
    }
    
    .share-links a:hover {
      color: var(--text-primary);
      border-color: var(--accent);
    }
    
    .archive-header {
      text-align: center;
      margin-bottom: 3rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid var(--border);
    }
    
    .archive-header h1 {
      font-size: 2rem;
      font-weight: 300;
      margin-bottom: 1rem;
    }
    
    .archive-header p {
      color: var(--text-secondary);
    }
    
    .archive-posts {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
    
    .archive-item {
      padding-bottom: 2rem;
      border-bottom: 1px solid var(--border);
    }
    
    .archive-item:last-child {
      border-bottom: none;
    }
    
    .archive-item h2 {
      font-size: 1.5rem;
      font-weight: 400;
      margin-bottom: 0.5rem;
    }
    
    .archive-item h2 a {
      color: var(--text-primary);
      text-decoration: none;
      transition: color 0.3s ease;
    }
    
    .archive-item h2 a:hover {
      color: var(--link);
    }
    
    .archive-meta {
      color: var(--text-muted);
      font-size: 0.9rem;
      margin-bottom: 1rem;
      display: flex;
      gap: 1rem;
    }
    
    .archive-excerpt {
      color: var(--text-secondary);
      margin-bottom: 1rem;
    }
    
    .archive-tags {
      margin-top: 1rem;
    }
    
    footer {
      border-top: 1px solid var(--border);
      padding: 3rem 0;
      margin-top: 4rem;
      text-align: center;
    }
    
    footer p {
      color: var(--text-muted);
      font-size: 0.9rem;
    }
    
    @media (max-width: 768px) {
      .container {
        padding: 0 1.5rem;
      }
      
      body {
        font-size: 16px;
      }
      
      .intro-content h1 {
        font-size: 2rem;
      }
      
      .single-post .post-header h1 {
        font-size: 2rem;
      }
      
      .post-header h3 {
        font-size: 1.5rem;
      }
      
      nav ul {
        flex-direction: column;
        gap: 1rem;
      }
      
      .categories-list {
        flex-direction: column;
        align-items: center;
      }
      
      .post-meta {
        flex-direction: column;
        gap: 0.5rem;
        align-items: flex-start;
      }
      
      .single-post .post-meta {
        align-items: center;
      }
      
      .share-links {
        flex-direction: column;
        align-items: center;
      }
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <div class="site-header">
        <h1 class="site-title"><a href="/">${BLOG_CONFIG.title}</a></h1>
        <p class="site-subtitle">${BLOG_CONFIG.subtitle}</p>
        <nav>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/category/writing">Writing</a></li>
            <li><a href="/category/thoughts">Thoughts</a></li>
            <li><a href="/feed.xml">RSS</a></li>
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
      <p>&copy; 2024 ${BLOG_CONFIG.title}. All rights reserved.</p>
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
