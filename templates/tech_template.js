
// Tech Blog Template - Fast & SEO Optimized
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
  title: "TechInsights Blog",
  subtitle: "Coding, Innovation & Technology Trends",
  author: "Tech Team",
  description: "Modern tech blog covering programming, web development, AI, and latest technology trends",
  keywords: "programming, web development, technology, coding, AI, javascript, python",
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
  const recentPosts = posts.slice(3, 12);
  const categories = [...new Set(posts.map(p => p.category).filter(Boolean))];
  const popularTags = [...new Set(posts.flatMap(p => p.tags || []))].slice(0, 10);

  const content = `
    <div class="hero-section">
      <div class="hero-content">
        <div class="hero-text">
          <h1>🚀 Welcome to the Future of Tech</h1>
          <p>Discover cutting-edge programming tutorials, tech insights, and innovation stories</p>
          <div class="hero-actions">
            <a href="#latest" class="btn-primary">Explore Articles</a>
            <a href="/category/tutorial" class="btn-secondary">Learn to Code</a>
          </div>
        </div>
        ${getAdCode('hero_section_ad') ? `<div class="hero-section-ad">${getAdCode('hero_section_ad')}</div>` : ''}
      </div>
    </div>

    <section class="categories-showcase">
      <h2>🔧 Tech Categories</h2>
      <div class="tech-categories">
        ${categories.map(cat => `
          <a href="/category/${encodeURIComponent(cat)}" class="tech-category">
            <div class="category-icon">${getCategoryIcon(cat)}</div>
            <h3>${cat}</h3>
            <span class="post-count">${posts.filter(p => p.category === cat).length} articles</span>
          </a>
        `).join('')}
        ${getAdCode('categories_showcase_ad') ? `<div class="categories-showcase-ad">${getAdCode('categories_showcase_ad')}</div>` : ''}
      </div>
    </section>

    <section class="featured-articles">
      <h2>⭐ Featured Articles</h2>
      <div class="featured-grid">
        ${featuredPosts.map(post => `
          <article class="featured-post">
            <div class="post-header">
              <h3><a href="/${post.id}">${post.title}</a></h3>
              <div class="post-meta">
                <time datetime="${post.date}">📅 ${post.date}</time>
                <span class="author">👨‍💻 ${post.author}</span>
                ${post.category ? `<span class="category">${getCategoryIcon(post.category)} ${post.category}</span>` : ''}
              </div>
            </div>
            ${post.tags ? `
              <div class="tech-tags">
                ${post.tags.slice(0, 3).map(tag => `<span class="tech-tag">${tag}</span>`).join('')}
              </div>
            ` : ''}
            <p class="post-excerpt">${post.excerpt}</p>
            <a href="/${post.id}" class="read-more-btn">Read Full Article →</a>
          </article>
        `).join('')}
        ${getAdCode('featured_articles_ad') ? `<div class="featured-articles-ad">${getAdCode('featured_articles_ad')}</div>` : ''}
      </div>
    </section>

    <section id="latest" class="latest-posts">
      <h2>📚 Latest Tech Posts</h2>
      <div class="posts-grid">
        ${recentPosts.map(post => `
          <article class="post-card">
            <h4><a href="/${post.id}">${post.title}</a></h4>
            <div class="card-meta">
              <time datetime="${post.date}">${post.date}</time>
              ${post.category ? `<span class="card-category">${post.category}</span>` : ''}
            </div>
            <p>${post.excerpt.substring(0, 100)}...</p>
            <a href="/${post.id}" class="card-link">Continue Reading</a>
          </article>
        `).join('')}
        ${getAdCode('latest_posts_ad') ? `<div class="latest-posts-ad">${getAdCode('latest_posts_ad')}</div>` : ''}
      </div>
    </section>

    <section class="tech-tags-cloud">
      <h2>🏷️ Popular Tech Tags</h2>
      <div class="tags-container">
        ${popularTags.map(tag => `
          <a href="/tag/${encodeURIComponent(tag)}" class="tag-item">${tag}</a>
        `).join('')}
        ${getAdCode('tags_cloud_ad') ? `<div class="tags-cloud-ad">${getAdCode('tags_cloud_ad')}</div>` : ''}
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

function getCategoryIcon(category) {
  const icons = {
    'Programming': '💻',
    'Web Development': '🌐',
    'AI': '🤖',
    'Mobile': '📱',
    'DevOps': '⚙️',
    'Data Science': '📊',
    'Tutorial': '📖',
    'Technology': '🔬',
    'JavaScript': '⚡',
    'Python': '🐍'
  };
  return icons[category] || '🔧';
}

function getPostPage(postId, currentDomain) {
  const domain = new URL(currentDomain).hostname || BLOG_CONFIG.domain;
  const post = posts.find(p => p.id === postId);
  if (!post) {
    return new Response('Post not found', { status: 404 });
  }

  const content = `
    <article class="tech-post" itemscope itemtype="http://schema.org/BlogPosting">
      <header class="post-header">
        <h1 itemprop="headline">${post.title}</h1>
        <div class="post-meta">
          <time datetime="${post.date}" itemprop="datePublished">📅 ${post.date}</time>
          <span itemprop="author" itemscope itemtype="http://schema.org/Person">
            👨‍💻 <span itemprop="name">${post.author}</span>
          </span>
          ${post.category ? `<span class="post-category">${getCategoryIcon(post.category)} <span itemprop="about">${post.category}</span></span>` : ''}
        </div>
        ${post.tags ? `
          <div class="post-tags">
            ${post.tags.map(tag => `<a href="/tag/${encodeURIComponent(tag)}" class="post-tag" itemprop="keywords">#${tag}</a>`).join(' ')}
          </div>
        ` : ''}
      </header>

      <div class="post-content" itemprop="articleBody">${post.content}</div>
      ${getAdCode('post_content_ad') ? `<div class="post-content-ad">${getAdCode('post_content_ad')}</div>` : ''}
      
      <div class="post-footer">
        <div class="share-section">
          <h4>💡 Found this helpful? Share it!</h4>
          <div class="share-buttons">
            <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`https://${domain}/${post.id}`)}" target="_blank" class="share-btn twitter">Twitter</a>
            <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://${domain}/${post.id}`)}" target="_blank" class="share-btn linkedin">LinkedIn</a>
          </div>
        </div>
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
    <div class="category-header">
      <h1>${getCategoryIcon(category)} ${category}</h1>
      <p>Comprehensive guides and tutorials for ${category.toLowerCase()}</p>
      <div class="category-stats">
        <span>📚 ${categoryPosts.length} articles</span>
        <span>🔥 Updated regularly</span>
      </div>
      ${getAdCode('category_header_ad') ? `<div class="category-header-ad">${getAdCode('category_header_ad')}</div>` : ''}
    </div>

    <div class="category-posts">
      ${categoryPosts.map(post => `
        <article class="category-post">
          <h3><a href="/${post.id}">${post.title}</a></h3>
          <div class="post-meta">
            <time datetime="${post.date}">📅 ${post.date}</time>
            <span class="author">👨‍💻 ${post.author}</span>
          </div>
          ${post.tags ? `
            <div class="post-tags">
              ${post.tags.slice(0, 3).map(tag => `<span class="mini-tag">${tag}</span>`).join('')}
            </div>
          ` : ''}
          <p>${post.excerpt}</p>
          <a href="/${post.id}" class="read-article">Read Article →</a>
        </article>
      `).join('')}
      ${getAdCode('category_posts_ad') ? `<div class="category-posts-ad">${getAdCode('category_posts_ad')}</div>` : ''}
    </div>
  `;

  return new Response(HTML_TEMPLATE
    .replace('{{title}}', `${category} - ${BLOG_CONFIG.title}`)
    .replace('{{description}}', `Learn ${category.toLowerCase()} with our comprehensive guides and tutorials`)
    .replace('{{keywords}}', `${category}, programming, tutorial, ${BLOG_CONFIG.keywords}`)
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
    <div class="tag-header">
      <h1>🏷️ #${tag}</h1>
      <p>All articles tagged with "${tag}"</p>
      <div class="tag-stats">
        <span>📚 ${tagPosts.length} articles</span>
      </div>
      ${getAdCode('tag_header_ad') ? `<div class="tag-header-ad">${getAdCode('tag_header_ad')}</div>` : ''}
    </div>

    <div class="tag-posts">
      ${tagPosts.map(post => `
        <article class="tag-post">
          <h3><a href="/${post.id}">${post.title}</a></h3>
          <div class="post-meta">
            <time datetime="${post.date}">📅 ${post.date}</time>
            <span class="author">👨‍💻 ${post.author}</span>
            ${post.category ? `<span class="category">${getCategoryIcon(post.category)} ${post.category}</span>` : ''}
          </div>
          <p>${post.excerpt}</p>
          <a href="/${post.id}" class="read-article">Read Article →</a>
        </article>
      `).join('')}
      ${getAdCode('tag_posts_ad') ? `<div class="tag-posts-ad">${getAdCode('tag_posts_ad')}</div>` : ''}
    </div>
  `;

  return new Response(HTML_TEMPLATE
    .replace('{{title}}', `#${tag} - ${BLOG_CONFIG.title}`)
    .replace('{{description}}', `Articles about ${tag}`)
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
  <meta name="twitter:card" content="summary_large_image">
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
      "@type": "Organization",
      "name": "${BLOG_CONFIG.author}"
    }
  }
  </script>
  
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    :root {
      --primary: #6366f1;
      --secondary: #8b5cf6;
      --accent: #06b6d4;
      --dark: #1e293b;
      --light: #f8fafc;
      --gray: #64748b;
      --border: #e2e8f0;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.6;
      color: var(--dark);
      background: var(--light);
    }
    
    .container { max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
    
    header {
      background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
      color: white;
      padding: 1rem 0;
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(10px);
    }
    
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .logo {
      font-size: 1.5rem;
      font-weight: 800;
      text-decoration: none;
      color: white;
    }
    
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
    
    .hero-section {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
      color: white;
      padding: 5rem 0;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    
    .hero-section::before {
      content: '';
      position: absolute;
      width: 200%;
      height: 200%;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="1" fill="rgba(255,255,255,0.1)"/></svg>') repeat;
      animation: float 20s linear infinite;
    }
    
    @keyframes float {
      0% { transform: translateY(0) rotate(0deg); }
      100% { transform: translateY(-100px) rotate(360deg); }
    }
    
    .hero-content {
      position: relative;
      z-index: 2;
    }
    
    .hero-content h1 {
      font-size: 3.5rem;
      font-weight: 900;
      margin-bottom: 1.5rem;
      background: linear-gradient(45deg, #f8fafc, #cbd5e1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .hero-content p {
      font-size: 1.25rem;
      margin-bottom: 2rem;
      opacity: 0.9;
    }
    
    .hero-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    
    .btn-primary, .btn-secondary {
      padding: 1rem 2rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.3s;
    }
    
    .btn-primary {
      background: var(--accent);
      color: white;
    }
    
    .btn-primary:hover { transform: translateY(-2px); }
    
    .btn-secondary {
      background: transparent;
      color: white;
      border: 2px solid white;
    }
    
    .btn-secondary:hover { background: white; color: var(--dark); }
    
    .categories-showcase, .featured-articles, .latest-posts, .tech-tags-cloud {
      padding: 4rem 0;
    }
    
    .categories-showcase h2, .featured-articles h2, .latest-posts h2, .tech-tags-cloud h2 {
      text-align: center;
      font-size: 2.5rem;
      margin-bottom: 3rem;
      color: var(--dark);
    }
    
    .tech-categories {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
    }
    
    .tech-category {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      text-align: center;
      text-decoration: none;
      color: var(--dark);
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transition: all 0.3s;
      border: 2px solid transparent;
    }
    
    .tech-category:hover {
      transform: translateY(-5px);
      border-color: var(--primary);
    }
    
    .category-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    
    .tech-category h3 {
      margin-bottom: 0.5rem;
      color: var(--dark);
    }
    
    .post-count {
      color: var(--gray);
      font-size: 0.9rem;
    }
    
    .featured-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 2rem;
    }
    
    .featured-post {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transition: transform 0.3s;
    }
    
    .featured-post:hover { transform: translateY(-5px); }
    
    .featured-post h3 a {
      color: var(--dark);
      text-decoration: none;
      font-size: 1.25rem;
      font-weight: 700;
    }
    
    .post-meta {
      color: var(--gray);
      font-size: 0.9rem;
      margin: 1rem 0;
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    
    .tech-tags {
      display: flex;
      gap: 0.5rem;
      margin: 1rem 0;
      flex-wrap: wrap;
    }
    
    .tech-tag {
      background: #e0e7ff;
      color: var(--primary);
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 500;
    }
    
    .read-more-btn {
      color: var(--primary);
      text-decoration: none;
      font-weight: 600;
      margin-top: 1rem;
      display: inline-block;
    }
    
    .posts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }
    
    .post-card {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: transform 0.3s;
    }
    
    .post-card:hover { transform: translateY(-3px); }
    
    .post-card h4 a {
      color: var(--dark);
      text-decoration: none;
      font-weight: 600;
    }
    
    .card-meta {
      color: var(--gray);
      font-size: 0.8rem;
      margin: 0.5rem 0;
    }
    
    .card-link {
      color: var(--primary);
      text-decoration: none;
      font-weight: 500;
    }
    
    .tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      justify-content: center;
    }
    
    .tag-item {
      background: white;
      color: var(--dark);
      padding: 0.75rem 1.5rem;
      border-radius: 25px;
      text-decoration: none;
      font-weight: 500;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: all 0.3s;
      border: 2px solid transparent;
    }
    
    .tag-item:hover {
      border-color: var(--primary);
      transform: translateY(-2px);
    }
    
    .tech-post {
      background: white;
      padding: 3rem;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      max-width: 800px;
      margin: 2rem auto;
    }
    
    .tech-post .post-header h1 {
      font-size: 2.5rem;
      color: var(--dark);
      margin-bottom: 1rem;
      line-height: 1.2;
    }
    
    .post-content {
      font-size: 1.1rem;
      line-height: 1.8;
      margin: 2rem 0;
    }
    
    .post-content h2, .post-content h3 {
      margin: 2rem 0 1rem 0;
      color: var(--dark);
    }
    
    .post-content pre {
      background: #f1f5f9;
      padding: 1rem;
      border-radius: 8px;
      overflow-x: auto;
      margin: 1rem 0;
    }
    
    .post-content code {
      background: #f1f5f9;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-family: 'Monaco', 'Menlo', monospace;
    }
    
    .post-tags {
      margin: 1rem 0;
    }
    
    .post-tag {
      background: #e0e7ff;
      color: var(--primary);
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      text-decoration: none;
      font-size: 0.8rem;
      margin-right: 0.5rem;
      font-weight: 500;
    }
    
    .share-section {
      background: var(--light);
      padding: 2rem;
      border-radius: 8px;
      text-align: center;
      margin-top: 3rem;
    }
    
    .share-buttons {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 1rem;
    }
    
    .share-btn {
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      transition: transform 0.3s;
    }
    
    .share-btn.twitter {
      background: #1da1f2;
      color: white;
    }
    
    .share-btn.linkedin {
      background: #0077b5;
      color: white;
    }
    
    .share-btn:hover { transform: translateY(-2px); }
    
    .category-header, .tag-header {
      background: white;
      padding: 3rem;
      text-align: center;
      border-radius: 12px;
      margin-bottom: 3rem;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .category-header h1, .tag-header h1 {
      font-size: 2.5rem;
      color: var(--dark);
      margin-bottom: 1rem;
    }
    
    .category-stats, .tag-stats {
      display: flex;
      gap: 2rem;
      justify-content: center;
      margin-top: 1rem;
      color: var(--gray);
    }
    
    .category-posts, .tag-posts {
      display: grid;
      gap: 2rem;
    }
    
    .category-post, .tag-post {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .category-post h3 a, .tag-post h3 a {
      color: var(--dark);
      text-decoration: none;
      font-size: 1.5rem;
    }
    
    .mini-tag {
      background: #f1f5f9;
      color: var(--gray);
      padding: 0.2rem 0.5rem;
      border-radius: 12px;
      font-size: 0.7rem;
      margin-right: 0.5rem;
    }
    
    .read-article {
      color: var(--primary);
      text-decoration: none;
      font-weight: 600;
      margin-top: 1rem;
      display: inline-block;
    }
    
    footer {
      background: var(--dark);
      color: white;
      padding: 3rem 0;
      text-align: center;
      margin-top: 4rem;
    }
    
    @media (max-width: 768px) {
      .hero-content h1 { font-size: 2.5rem; }
      .header-content { flex-direction: column; gap: 1rem; }
      nav ul { flex-direction: column; gap: 1rem; text-align: center; }
      .hero-actions { flex-direction: column; align-items: center; }
      .tech-categories, .featured-grid, .posts-grid {
        grid-template-columns: 1fr;
      }
      .category-stats, .tag-stats {
        flex-direction: column;
        gap: 1rem;
      }
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <div class="header-content">
        <a href="/" class="logo">🚀 ${BLOG_CONFIG.title}</a>
        <nav>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/category/programming">Programming</a></li>
            <li><a href="/category/tutorial">Tutorials</a></li>
            <li><a href="/category/ai">AI & ML</a></li>
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
      <p>&copy; 2024 ${BLOG_CONFIG.title}. Empowering developers with cutting-edge content.</p>
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
