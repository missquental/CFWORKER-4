def get_related_articles(posts, current_post_id, max_related=3):
    """Get related articles based on category and tags"""
    current_post = None
    for post in posts:
        if post['id'] == current_post_id:
            current_post = post
            break

    if not current_post:
        return []

    related_posts = []
    current_category = current_post.get('category', '')
    current_tags = current_post.get('tags', [])

    for post in posts:
        if post['id'] == current_post_id:
            continue

        score = 0

        # Same category gets higher score
        if post.get('category') == current_category:
            score += 3

        # Common tags get points
        post_tags = post.get('tags', [])
        common_tags = set(current_tags) & set(post_tags)
        score += len(common_tags)

        if score > 0:
            related_posts.append({
                'post': post,
                'score': score
            })

    # Sort by score and return top results
    related_posts.sort(key=lambda x: x['score'], reverse=True)
    return [item['post'] for item in related_posts[:max_related]]

def get_navigation_posts(posts, current_post_id):
    """Get next and previous posts for navigation"""
    current_index = -1

    for i, post in enumerate(posts):
        if post['id'] == current_post_id:
            current_index = i
            break

    if current_index == -1:
        return {'next': None, 'previous': None}

    next_post = posts[current_index + 1] if current_index + 1 < len(posts) else None
    previous_post = posts[current_index - 1] if current_index > 0 else None

    return {
        'next': next_post,
        'previous': previous_post
    }

def generate_related_articles_html(related_posts):
    """Generate HTML for related articles section"""
    if not related_posts:
        return ""

    html = """
    <div class="related-articles">
        <h3>📚 Artikel Terkait</h3>
        <div class="related-grid">
    """

    for post in related_posts:
        html += f"""
            <div class="related-item">
                <h4><a href="/post/{post['id']}">{post['title']}</a></h4>
                <p class="related-excerpt">{post['excerpt'][:100]}...</p>
                <div class="related-meta">
                    <span class="date">📅 {post['date']}</span>
                    <span class="category">🏷️ {post.get('category', 'Umum')}</span>
                </div>
            </div>
        """

    html += """
        </div>
    </div>
    """
    return html

def generate_navigation_html(navigation):
    """Generate HTML for post navigation"""
    if not navigation['next'] and not navigation['previous']:
        return ""

    html = """
    <div class="post-navigation">
        <div class="nav-container">
    """

    if navigation['previous']:
        html += f"""
            <div class="nav-previous">
                <span class="nav-label">← Artikel Sebelumnya</span>
                <a href="/post/{navigation['previous']['id']}" class="nav-link">
                    {navigation['previous']['title']}
                </a>
            </div>
        """
    else:
        html += '<div class="nav-previous"></div>'

    if navigation['next']:
        html += f"""
            <div class="nav-next">
                <span class="nav-label">Artikel Selanjutnya →</span>
                <a href="/post/{navigation['next']['id']}" class="nav-link">
                    {navigation['next']['title']}
                </a>
            </div>
        """
    else:
        html += '<div class="nav-next"></div>'

    html += """
        </div>
    </div>
    """
    return html

def get_template_config():
    """Get available templates configuration"""
    return {
        'modern': {
            'name': 'Modern Clean',
            'description': 'Design minimalis dengan fokus pada readability dan user experience',
            'preview': 'Layout bersih dengan sidebar, kategori dan tag yang terorganisir'
        },
        'magazine': {
            'name': 'Magazine Style', 
            'description': 'Layout berita dengan breaking news ticker dan grid posts',
            'preview': 'Seperti portal berita dengan featured post dan kategorisasi yang kuat'
        },
        'corporate': {
            'name': 'Corporate Professional',
            'description': 'Design profesional untuk blog bisnis dengan contact info dan CTA',
            'preview': 'Hero section, kategori bisnis, dan contact form terintegrasi'
        },
        'business': {
            'name': 'Business Solutions',
            'description': 'Template bisnis dengan optimasi SEO maksimal dan loading cepat',
            'preview': 'Hero banner, services grid, featured insights, dan contact CTA'
        },
        'tech': {
            'name': 'Tech Insights',
            'description': 'Template tech blog dengan animasi modern dan code-friendly design',
            'preview': 'Tech categories, animated hero, syntax highlighting, dan share buttons'
        },
        'minimal': {
            'name': 'Minimal Portfolio',
            'description': 'Ultra clean design dengan fokus pada typography dan konten',
            'preview': 'Clean typography, minimal layout, dan fast loading performance'
        }
    }

def get_modern_template():
    """Load modern template from file"""
    try:
        with open('templates/modern_template.js', 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        # Fallback to basic template if file not found
        return get_basic_template()

def get_magazine_template():
    """Load magazine template from file"""
    try:
        with open('templates/magazine_template.js', 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        # Fallback to basic template if file not found
        return get_basic_template()

def get_corporate_template():
    """Load corporate template from file"""
    try:
        with open('templates/corporate_template.js', 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        # Fallback to basic template if file not found
        return get_basic_template()

def get_business_template():
    """Load business template from file"""
    try:
        with open('templates/business_template.js', 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        # Fallback to basic template if file not found
        return get_basic_template()

def get_tech_template():
    """Load tech template from file"""
    try:
        with open('templates/tech_template.js', 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        # Fallback to basic template if file not found
        return get_basic_template()

def get_minimal_template():
    """Load minimal template from file"""
    try:
        with open('templates/minimal_template.js', 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        # Fallback to basic template if file not found
        return get_basic_template()

def get_basic_template():
    """Basic fallback template"""
    return '''
// Basic Blog Template
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const path = url.pathname

  if (path === '/') {
    return getHomePage()
  } else {
    const postId = path.substring(1)
    const post = posts.find(p => p.id === postId)
    if (post) {
      return getPostPage(post)
    }
    return getHomePage()
  }
}

const posts = {{POSTS_DATA}};

function getHomePage() {
  const postsHtml = posts.map(post => `
    <div style="border: 1px solid #ddd; padding: 1rem; margin: 1rem 0;">
      <h2><a href="/${post.id}">${post.title}</a></h2>
      <p>${post.excerpt}</p>
      <small>By ${post.author} on ${post.date}</small>
    </div>
  `).join('');

  return new Response(`
    <html>
      <head><title>Blog</title></head>
      <body>
        <h1>My Blog</h1>
        ${postsHtml}
      </body>
    </html>
  `, { headers: { 'Content-Type': 'text/html' } });
}

function getPostPage(post) {
  return new Response(`
    <html>
      <head><title>${post.title}</title></head>
      <body>
        <h1>${post.title}</h1>
        <p>By ${post.author} on ${post.date}</p>
        <div>${post.content}</div>
        <a href="/">← Back to Home</a>
      </body>
    </html>
  `, { headers: { 'Content-Type': 'text/html' } });
}
'''