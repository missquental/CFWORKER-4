import streamlit as st
import requests
import json
import os
import time
from datetime import datetime
import base64
import re
from utils import generate_post_id, extract_excerpt_from_content, truncate_text

# Import markdown with fallback
try:
    import markdown
    MARKDOWN_AVAILABLE = True
except ImportError:
    MARKDOWN_AVAILABLE = False
    st.warning("⚠️ Markdown tidak tersedia. Install: pip install markdown")

# Import AI modules with error handling
try:
    from gemini import GeminiScraper
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    st.warning("⚠️ Gemini AI tidak tersedia. Install: pip install google-generativeai langdetect langcodes")

try:
    from bingimage import BingImageScraper
    BING_AVAILABLE = True
except ImportError:
    BING_AVAILABLE = False
    st.warning("⚠️ Bing Image scraper tidak tersedia. Install: pip install beautifulsoup4 pillow")

# Konfigurasi halaman
st.set_page_config(
    page_title="Blog Management Dashboard",
    page_icon="📝",
    layout="wide"
)

# CSS untuk styling
st.markdown("""
<style>
    .main-header {
        text-align: center;
        padding: 2rem 0;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 10px;
        margin-bottom: 2rem;
    }
    .blog-card {
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 1rem;
        margin: 1rem 0;
        background: #f9f9f9;
    }
    .success-msg {
        background: #d4edda;
        border: 1px solid #c3e6cb;
        color: #155724;
        padding: 0.75rem;
        border-radius: 0.25rem;
        margin: 1rem 0;
    }
    .error-msg {
        background: #f8d7da;
        border: 1px solid #f5c6cb;
        color: #721c24;
        padding: 0.75rem;
        border-radius: 0.25rem;
        margin: 1rem 0;
    }
</style>
""", unsafe_allow_html=True)

def init_session_state():
    """Initialize session state variables"""
    if 'authenticated' not in st.session_state:
        st.session_state.authenticated = False
    if 'posts' not in st.session_state:
        st.session_state.posts = []
    if 'cf_account_id' not in st.session_state:
        st.session_state.cf_account_id = ""
    if 'cf_api_token' not in st.session_state:
        st.session_state.cf_api_token = ""
    if 'worker_subdomain' not in st.session_state:
        st.session_state.worker_subdomain = ""
    if 'worker_name' not in st.session_state:
        st.session_state.worker_name = ""
    if 'account_name' not in st.session_state:
        st.session_state.account_name = ""
    if 'selected_template' not in st.session_state:
        st.session_state.selected_template = "modern"
    if 'ads_config' not in st.session_state:
        st.session_state.ads_config = {
            'header_ad': {'code': '', 'enabled': False},
            'footer_ad': {'code': '', 'enabled': False},
            'sidebar_ad': {'code': '', 'enabled': False},
            'in_content_ad': {'code': '', 'enabled': False},
            'popup_ad': {'code': '', 'enabled': False}
        }

def get_account_name(account_id, api_token):
    """Ambil nama akun berdasarkan account_id"""
    try:
        headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
        response = requests.get("https://api.cloudflare.com/client/v4/accounts", headers=headers)
        if response.status_code == 200:
            accounts = response.json().get("result", [])
            for acc in accounts:
                if acc["id"] == account_id:
                    return acc["name"]
        return None
    except Exception as e:
        return None

def format_account_name(account_name):
    """Format nama akun untuk subdomain yang valid"""
    if not account_name:
        return None

    # Hapus karakter yang tidak valid untuk subdomain
    # Hanya izinkan huruf, angka, dan dash
    import re

    # Ambil bagian sebelum @ jika ada email
    if '@' in account_name:
        account_name = account_name.split('@')[0]

    # Hapus 'saccount atau karakter serupa
    account_name = re.sub(r"'s?account", "", account_name, flags=re.IGNORECASE)

    # Ganti karakter tidak valid dengan dash atau hapus
    account_name = re.sub(r'[^a-zA-Z0-9-]', '', account_name)

    # Hapus dash berturut-turut dan di awal/akhir
    account_name = re.sub(r'-+', '-', account_name).strip('-')

    # Konversi ke lowercase
    account_name = account_name.lower()

    # Pastikan tidak kosong dan tidak terlalu panjang
    if not account_name or len(account_name) < 1:
        return "user"

    # Batasi panjang maksimal 63 karakter (standar DNS)
    return account_name[:63]

def get_workers_list(account_id, api_token):
    """Ambil daftar workers berdasarkan account_id"""
    try:
        headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
        response = requests.get(f"https://api.cloudflare.com/client/v4/accounts/{account_id}/workers/scripts", headers=headers)
        if response.status_code == 200:
            workers = response.json().get("result", [])
            # Ambil informasi subdomain tiap worker
            for worker in workers:
                subdomain_url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/workers/scripts/{worker['id']}/subdomain"
                subdomain_response = requests.get(subdomain_url, headers=headers)
                if subdomain_response.status_code == 200:
                    subdomain_data = subdomain_response.json().get("result", {})
                    worker['subdomain'] = subdomain_data.get('subdomain')  # Tambahkan info subdomain
                else:
                    worker['subdomain'] = None

            return workers
        else:
            st.error(f"❌ Gagal mengambil daftar worker. Status code: {response.status_code}")
            return None
    except Exception as e:
        st.error(f"❌ Error mengambil daftar worker: {str(e)}")
        return None

def get_connected_domains():
    """Ambil daftar domain yang sudah terkoneksi ke akun Cloudflare"""
    try:
        headers = {
            "Authorization": f"Bearer {st.session_state.cf_api_token}",
            "Content-Type": "application/json"
        }

        response = requests.get("https://api.cloudflare.com/client/v4/zones", headers=headers)

        if response.status_code == 200:
            zones = response.json().get("result", [])
            # Filter hanya domain yang aktif
            active_domains = [zone["name"] for zone in zones if zone["status"] == "active"]
            return active_domains
        else:
            return []
    except Exception as e:
        st.error(f"❌ Error mengambil daftar domain: {str(e)}")
        return []

def create_subdomain_route(subdomain, domain):
    """Buat route subdomain untuk worker"""
    try:
        headers = {
            "Authorization": f"Bearer {st.session_state.cf_api_token}",
            "Content-Type": "application/json"
        }

        # Test API connection first
        test_response = requests.get("https://api.cloudflare.com/client/v4/user/tokens/verify", headers=headers)
        if test_response.status_code != 200:
            st.error("❌ API Token tidak valid atau expired. Silakan periksa kembali API Token Anda.")
            return False

        # Pastikan worker sudah ada, jika tidak deploy dulu
        worker_exists = check_worker_exists()
        if not worker_exists:
            st.info("🚀 Worker belum ada, mendeploy worker terlebih dahulu...")
            from templates import get_modern_template
            worker_script = get_modern_template().replace('{{POSTS_DATA}}', json.dumps(st.session_state.posts, indent=2))
            if not deploy_worker(worker_script):
                st.error("❌ Gagal deploy worker. Periksa API Token permissions.")
                return False
            st.success("✅ Worker berhasil di-deploy")

        # Dapatkan zone ID untuk domain
        zones_response = requests.get("https://api.cloudflare.com/client/v4/zones", headers=headers)
        if zones_response.status_code != 200:
            error_data = zones_response.json()
            st.error(f"❌ Gagal mengakses zones. Error: {error_data.get('errors', [{}])[0].get('message', 'Unknown error')}")
            return False

        zones = zones_response.json().get("result", [])
        zone_id = None

        for zone in zones:
            if zone["name"] == domain:
                zone_id = zone["id"]
                break

        if not zone_id:
            st.error(f"❌ Domain {domain} tidak ditemukan di akun Cloudflare. Pastikan domain sudah ditambahkan ke akun ini.")
            return False

        # Cek apakah DNS record sudah ada
        existing_dns = requests.get(
            f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records?name={subdomain}.{domain}",
            headers=headers
        )

        if existing_dns.status_code == 200:
            existing_records = existing_dns.json().get("result", [])
            if existing_records:
                st.info(f"📝 DNS record untuk {subdomain}.{domain} sudah ada")
            else:
                # Buat DNS record untuk subdomain (menggunakan A record dengan dummy IP)
                dns_data = {
                    "type": "A",
                    "name": subdomain,
                    "content": "192.0.2.1",  # Dummy IP, akan di-override oleh worker
                    "proxied": True,
                    "ttl": 1  # Auto TTL
                }

                dns_response = requests.post(
                    f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records",
                    headers=headers,
                    json=dns_data
                )

                if dns_response.status_code != 200:
                    st.error(f"❌ Gagal membuat DNS record: {dns_response.text}")
                    return False

                st.success(f"✅ DNS record untuk {subdomain}.{domain} berhasil dibuat")

        # Cek existing routes
        routes_response = requests.get(
            f"https://api.cloudflare.com/client/v4/zones/{zone_id}/workers/routes",
            headers=headers
        )

        existing_routes = []
        if routes_response.status_code == 200:
            existing_routes = routes_response.json().get("result", [])

        # Cek apakah route sudah ada
        route_pattern = f"{subdomain}.{domain}/*"
        route_exists = any(route.get("pattern") == route_pattern for route in existing_routes)

        if route_exists:
            st.info(f"📝 Route untuk {subdomain}.{domain} sudah ada")
        else:
            # Buat worker route untuk subdomain
            route_data = {
                "pattern": route_pattern,
                "script": st.session_state.worker_name
            }

            route_response = requests.post(
                f"https://api.cloudflare.com/client/v4/zones/{zone_id}/workers/routes",
                headers=headers,
                json=route_data
            )

            if route_response.status_code != 200:
                route_error = route_response.json()
                st.error(f"❌ Gagal membuat worker route: {route_error}")
                return False

            st.success(f"✅ Worker route untuk {subdomain}.{domain} berhasil dibuat")

        return True

    except Exception as e:
        st.error(f"❌ Error membuat subdomain: {str(e)}")
        return False

def check_worker_exists():
    """Cek apakah worker sudah ada"""
    try:
        headers = {
            "Authorization": f"Bearer {st.session_state.cf_api_token}",
            "Content-Type": "application/json"
        }

        response = requests.get(
            f"https://api.cloudflare.com/client/v4/accounts/{st.session_state.cf_account_id}/workers/scripts/{st.session_state.worker_name}",
            headers=headers
        )

        return response.status_code == 200

    except Exception:
        return False

def authenticate():
    """Authentication form"""
    st.markdown('<div class="main-header"><h1>🚀 Blog Management System</h1><p>Kelola blog Cloudflare Worker Anda dengan mudah</p></div>', unsafe_allow_html=True)

    with st.form("auth_form"):
        st.subheader("🔐 Konfigurasi Cloudflare")

        account_id = st.text_input(
            "Account ID Cloudflare:",
            placeholder="Masukkan Account ID dari dashboard Cloudflare",
            help="Bisa ditemukan di dashboard Cloudflare bagian kanan bawah"
        )

        api_token = st.text_input(
            "API Token:",
            type="password",
            placeholder="Masukkan API Token dengan permission Workers:Edit",
            help="Buat di https://dash.cloudflare.com/profile/api-tokens"
        )

        connect_submit = st.form_submit_button("🔗 Connect & Load Workers", use_container_width=True)

        if connect_submit:
            if account_id and api_token:
                if test_cloudflare_connection(account_id, api_token):
                    account_name = get_account_name(account_id, api_token)
                    if account_name:
                        st.session_state.cf_account_id = account_id
                        st.session_state.cf_api_token = api_token
                        st.session_state.account_name = account_name
                        st.session_state.workers_loaded = True
                        st.success(f"✅ Koneksi berhasil! Akun: {account_name}")
                        st.rerun()
                    else:
                        st.error("❌ Gagal mengambil nama akun. Periksa API Token dan Account ID.")
                else:
                    st.error("❌ Gagal terhubung ke Cloudflare. Periksa credentials Anda.")
            else:
                st.error("⚠️ Account ID dan API Token harus diisi!")

    # Jika sudah connect, tampilkan pilihan workers
    if st.session_state.get('workers_loaded', False):
        st.markdown("---")
        st.subheader("📋 Pilih Worker untuk Dikelola")

        workers = get_workers_list(st.session_state.cf_account_id, st.session_state.cf_api_token)

        if workers:
            # Tampilkan dalam bentuk tabel
            st.write("**Workers yang tersedia di akun Anda:**")

            for idx, worker in enumerate(workers):
                col1, col2, col3 = st.columns([3, 2, 1])

                with col1:
                    st.write(f"🔧 **{worker['id']}**")
                    if worker['subdomain']:
                        st.write(f"🌐 {worker['subdomain']}.workers.dev")

                with col2:
                    if worker['modified_on']:
                        modified_date = worker['modified_on'][:10]
                        st.write(f"📅 Modified: {modified_date}")

                with col3:
                    if st.button(f"Pilih", key=f"select_{idx}"):
                        worker_name = worker['id']
                        account_subdomain = format_account_name(st.session_state.account_name)
                        full_worker_url = f"{worker_name}.{account_subdomain}.workers.dev"

                        st.session_state.worker_name = worker_name
                        st.session_state.worker_subdomain = full_worker_url
                        st.session_state.authenticated = True
                        st.success(f"✅ Worker {worker_name} dipilih!")
                        st.rerun()

                st.markdown("---")

            # Opsi untuk membuat worker baru
            st.subheader("🆕 Atau Buat Worker Baru")

            with st.form("new_worker_form"):
                new_worker_name = st.text_input(
                    "Nama Worker Baru:",
                    placeholder="contoh: blog-pribadi",
                    help="Nama unik untuk worker baru"
                )

                create_submit = st.form_submit_button("🆕 Buat Worker Baru", use_container_width=True)

                if create_submit and new_worker_name:
                    worker_name = new_worker_name
                    account_subdomain = format_account_name(st.session_state.account_name)
                    full_worker_url = f"{worker_name}.{account_subdomain}.workers.dev"

                    st.session_state.worker_name = worker_name
                    st.session_state.worker_subdomain = full_worker_url
                    st.session_state.authenticated = True
                    st.success(f"✅ Worker baru {worker_name} akan dibuat saat deploy!")
                    st.rerun()

        else:
            st.info("📝 Belum ada workers di akun ini. Buat worker baru:")

            with st.form("first_worker_form"):
                first_worker_name = st.text_input(
                    "Nama Worker:",
                    placeholder="contoh: blog-pertama",
                    help="Nama untuk worker pertama Anda"
                )

                first_submit = st.form_submit_button("🆕 Buat Worker Pertama", use_container_width=True)

                if first_submit and first_worker_name:
                    worker_name = first_worker_name
                    account_subdomain = format_account_name(st.session_state.account_name)
                    full_worker_url = f"{worker_name}.{account_subdomain}.workers.dev"

                    st.session_state.worker_name = worker_name
                    st.session_state.worker_subdomain = full_worker_url
                    st.session_state.authenticated = True
                    st.success(f"✅ Worker {worker_name} akan dibuat saat deploy!")
                    st.rerun()

def test_cloudflare_connection(account_id, api_token):
    """Test connection to Cloudflare API"""
    try:
        headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
        response = requests.get(f"https://api.cloudflare.com/client/v4/accounts/{account_id}", headers=headers)
        return response.status_code == 200
    except:
        return False

def deploy_worker(script_content):
    """Deploy worker to Cloudflare"""
    try:
        headers = {
            "Authorization": f"Bearer {st.session_state.cf_api_token}",
            "Content-Type": "application/javascript"
        }

        # Deploy worker dengan nama yang benar
        url = f"https://api.cloudflare.com/client/v4/accounts/{st.session_state.cf_account_id}/workers/scripts/{st.session_state.worker_name}"

        response = requests.put(url, headers=headers, data=script_content)

        if response.status_code == 200:
            # Enable subdomain untuk worker
            subdomain_url = f"https://api.cloudflare.com/client/v4/accounts/{st.session_state.cf_account_id}/workers/scripts/{st.session_state.worker_name}/subdomain"
            subdomain_data = {"enabled": True}

            subdomain_headers = {
                "Authorization": f"Bearer {st.session_state.cf_api_token}",
                "Content-Type": "application/json"
            }

            requests.post(subdomain_url, headers=subdomain_headers, json=subdomain_data)
            return True
        return False
    except Exception as e:
        st.error(f"Error deploying worker: {str(e)}")
        return False

def get_current_worker_script():
    """Get current worker script from Cloudflare"""
    try:
        headers = {
            "Authorization": f"Bearer {st.session_state.cf_api_token}",
            "Content-Type": "application/json"
        }

        url = f"https://api.cloudflare.com/client/v4/accounts/{st.session_state.cf_account_id}/workers/scripts/{st.session_state.worker_name}"
        response = requests.get(url, headers=headers)

        if response.status_code == 200:
            return response.text
        return None
    except Exception as e:
        st.error(f"Error getting current worker script: {str(e)}")
        return None

def deploy_articles_only():
    """Deploy hanya artikel tanpa mengubah template"""
    try:
        # Ambil script worker yang sudah ada
        current_script = get_current_worker_script()

        if not current_script:
            st.error("❌ Tidak dapat mengambil script worker yang ada. Worker mungkin belum pernah di-deploy.")
            return False

        # Convert markdown to HTML untuk posts
        processed_posts = []
        for post in st.session_state.posts:
            processed_post = post.copy()
            if MARKDOWN_AVAILABLE:
                processed_post['content'] = markdown.markdown(post['content'])
                processed_post['excerpt'] = markdown.markdown(post['excerpt'])
            else:
                processed_post['content'] = post['content'].replace('\n', '<br>')
                processed_post['excerpt'] = post['excerpt'].replace('\n', '<br>')
            processed_posts.append(processed_post)

        # Replace data posts di script yang ada
        posts_json = json.dumps(processed_posts, indent=2)

        # Cari dan replace bagian POSTS_DATA
        import re
        pattern = r'const posts = \{\{POSTS_DATA\}\};|const posts = \[.*?\];'

        # Jika template menggunakan placeholder
        if '{{POSTS_DATA}}' in current_script:
            updated_script = current_script.replace('{{POSTS_DATA}}', posts_json)
        else:
            # Jika sudah di-replace sebelumnya, cari pattern const posts = [...]
            updated_script = re.sub(
                r'const posts = \[.*?\];', 
                f'const posts = {posts_json};', 
                current_script, 
                flags=re.DOTALL
            )

        # Deploy script yang sudah diupdate
        return deploy_worker(updated_script)

    except Exception as e:
        st.error(f"Error deploying articles: {str(e)}")
        return False

def deploy_template_only():
    """Deploy hanya template tanpa mengubah artikel"""
    try:
        # Ambil script worker yang sudah ada
        current_script = get_current_worker_script()

        if not current_script:
            st.error("❌ Tidak dapat mengambil script worker yang ada. Worker mungkin belum pernah di-deploy.")
            return False

        # Extract posts data dari script yang ada
        existing_posts = []
        import re

        # Cari data posts yang ada di script
        posts_match = re.search(r'const posts = (\[.*?\]);', current_script, re.DOTALL)

        if posts_match:
            try:
                posts_str = posts_match.group(1)
                existing_posts = json.loads(posts_str)
            except json.JSONDecodeError:
                st.warning("⚠️ Tidak dapat membaca artikel existing. Akan menggunakan artikel dari dashboard.")
                existing_posts = st.session_state.posts

        # Jika tidak ada posts di script, gunakan dari session state
        if not existing_posts:
            existing_posts = st.session_state.posts

        # Generate script baru dengan template terbaru tapi posts lama
        from templates import (get_modern_template, get_magazine_template, get_corporate_template,
                              get_business_template, get_tech_template, get_minimal_template)

        selected_template = st.session_state.get('selected_template', 'modern')

        # Load template based on selection
        if selected_template == 'magazine':
            template_script = get_magazine_template()
        elif selected_template == 'corporate':
            template_script = get_corporate_template()
        elif selected_template == 'business':
            template_script = get_business_template()
        elif selected_template == 'tech':
            template_script = get_tech_template()
        elif selected_template == 'minimal':
            template_script = get_minimal_template()
        else:  # default to modern
            template_script = get_modern_template()

        # Replace placeholders
        posts_json = json.dumps(existing_posts, indent=2)
        ads_json = json.dumps(st.session_state.ads_config, indent=2)

        template_script = template_script.replace('{{POSTS_DATA}}', posts_json)
        template_script = template_script.replace('{{ADS_CONFIG}}', ads_json)

        # Deploy script yang sudah diupdate
        return deploy_worker(template_script)

    except Exception as e:
        st.error(f"Error deploying template: {str(e)}")
        return False

def generate_worker_script():
    """Generate worker script dengan posts dan ads dari session state"""
    from templates import (get_modern_template, get_magazine_template, get_corporate_template,
                          get_business_template, get_tech_template, get_minimal_template)

    # Convert markdown to HTML
    for post in st.session_state.posts:
        if MARKDOWN_AVAILABLE:
            post['content'] = markdown.markdown(post['content'])
            post['excerpt'] = markdown.markdown(post['excerpt'])
        else:
            # Simple fallback - replace line breaks
            post['content'] = post['content'].replace('\n', '<br>')
            post['excerpt'] = post['excerpt'].replace('\n', '<br>')

    posts_json = json.dumps(st.session_state.posts, indent=2)
    ads_json = json.dumps(st.session_state.ads_config, indent=2)

    # Get selected template
    selected_template = st.session_state.get('selected_template', 'modern')

    # Load template based on selection
    if selected_template == 'magazine':
        template_script = get_magazine_template()
    elif selected_template == 'corporate':
        template_script = get_corporate_template()
    elif selected_template == 'business':
        template_script = get_business_template()
    elif selected_template == 'tech':
        template_script = get_tech_template()
    elif selected_template == 'minimal':
        template_script = get_minimal_template()
    else:  # default to modern
        template_script = get_modern_template()

    # Replace data placeholders
    template_script = template_script.replace('{{POSTS_DATA}}', posts_json)
    template_script = template_script.replace('{{ADS_CONFIG}}', ads_json)

    return template_script

def ads_management_page():
    """Halaman untuk mengelola iklan"""
    st.header("📢 Kelola Iklan")

    st.info("💡 Kelola iklan yang akan ditampilkan di berbagai posisi pada blog Anda. Dukung kode HTML, JavaScript, dan Google AdSense.")

    # Tabs untuk berbagai jenis iklan
    tab1, tab2, tab3, tab4, tab5 = st.tabs(["📄 Header", "🦶 Footer", "📋 Sidebar", "📝 In-Content", "🚨 Popup"])

    with tab1:
        manage_ad_section("header_ad", "Header Advertisement", 
                         "Iklan yang ditampilkan di bagian atas halaman")

    with tab2:
        manage_ad_section("footer_ad", "Footer Advertisement", 
                         "Iklan yang ditampilkan di bagian bawah halaman")

    with tab3:
        manage_ad_section("sidebar_ad", "Sidebar Advertisement", 
                         "Iklan yang ditampilkan di sidebar blog")

    with tab4:
        manage_ad_section("in_content_ad", "In-Content Advertisement", 
                         "Iklan yang ditampilkan di tengah artikel")

    with tab5:
        manage_ad_section("popup_ad", "Popup Advertisement", 
                         "Iklan popup yang muncul setelah beberapa detik")

    # Preview ads
    st.markdown("---")
    st.subheader("📊 Status Iklan")

    col1, col2, col3, col4, col5 = st.columns(5)

    with col1:
        status = "✅ Aktif" if st.session_state.ads_config['header_ad']['enabled'] else "❌ Nonaktif"
        st.metric("Header", status)

    with col2:
        status = "✅ Aktif" if st.session_state.ads_config['footer_ad']['enabled'] else "❌ Nonaktif"
        st.metric("Footer", status)

    with col3:
        status = "✅ Aktif" if st.session_state.ads_config['sidebar_ad']['enabled'] else "❌ Nonaktif"
        st.metric("Sidebar", status)

    with col4:
        status = "✅ Aktif" if st.session_state.ads_config['in_content_ad']['enabled'] else "❌ Nonaktif"
        st.metric("In-Content", status)

    with col5:
        status = "✅ Aktif" if st.session_state.ads_config['popup_ad']['enabled'] else "❌ Nonaktif"
        st.metric("Popup", status)

    # Example codes
    with st.expander("💡 Contoh Kode Iklan"):
        st.markdown("""
        **Google AdSense:**
        ```html
        <ins class="adsbygoogle"
             style="display:block"
             data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
             data-ad-slot="XXXXXXXXXX"
             data-ad-format="auto"></ins>
        <script>
             (adsbygoogle = window.adsbygoogle || []).push({});
        </script>
        ```

        **Banner HTML Sederhana:**
        ```html
        <div style="text-align: center; padding: 20px;">
            <a href="https://example.com" target="_blank">
                <img src="https://via.placeholder.com/728x90?text=Your+Ad+Here" 
                     alt="Advertisement" style="max-width: 100%; height: auto;">
            </a>
        </div>
        ```

        **Affiliate Link:**
        ```html
        <div style="background: #f0f0f0; padding: 15px; text-align: center; border-radius: 8px;">
            <p><strong>🛍️ Sponsored:</strong></p>
            <a href="https://affiliate-link.com" target="_blank" style="color: #007cba;">
                Check out this amazing product!
            </a>
        </div>
        ```
        """)

def manage_ad_section(ad_key, title, description):
    """Manage individual ad section"""
    st.subheader(title)
    st.write(description)

    # Enable/disable toggle
    enabled = st.checkbox(f"Aktifkan {title}", 
                         value=st.session_state.ads_config[ad_key]['enabled'],
                         key=f"{ad_key}_enabled")

    # Ad code input
    ad_code = st.text_area(
        "Kode Iklan (HTML/JavaScript):",
        value=st.session_state.ads_config[ad_key]['code'],
        height=200,
        placeholder=f"Masukkan kode {title.lower()} di sini...",
        help="Mendukung HTML, JavaScript, Google AdSense, atau kode iklan lainnya",
        key=f"{ad_key}_code"
    )

    # Update session state
    st.session_state.ads_config[ad_key]['enabled'] = enabled
    st.session_state.ads_config[ad_key]['code'] = ad_code

    # Preview
    if enabled and ad_code.strip():
        st.success(f"✅ {title} aktif dan siap ditampilkan")

        with st.expander(f"👁️ Preview {title}"):
            st.code(ad_code, language='html')
    elif enabled and not ad_code.strip():
        st.warning(f"⚠️ {title} diaktifkan tapi kode iklan kosong")
    else:
        st.info(f"ℹ️ {title} tidak aktif")

def main_dashboard():
    """Main dashboard interface"""
    st.markdown('<div class="main-header"><h1>📝 Blog Management</h1></div>', unsafe_allow_html=True)

    # Sidebar untuk navigasi
    with st.sidebar:
        st.header("🎛️ Menu")
        page = st.selectbox("Pilih Halaman:", ["📋 Kelola Post", "🎨 Template", "📢 Kelola Iklan", "🚀 Deploy", "⏰ Auto Generator", "⚙️ Settings"])

        st.markdown("---")
        # Format ulang URL untuk display yang benar
        if 'worker_name' in st.session_state and 'account_name' in st.session_state:
            clean_account = format_account_name(st.session_state.account_name)
            display_url = f"{st.session_state.worker_name}.{clean_account}.workers.dev"
            st.markdown(f"**Worker URL:**  \n`https://{display_url}`")
        else:
            st.markdown(f"**Worker URL:**  \n`https://{st.session_state.worker_subdomain}`")
        st.markdown(f"**Account:** {st.session_state.account_name}")
        st.markdown(f"**Worker Name:** {st.session_state.worker_name}")

        if st.button("🔓 Logout"):
            st.session_state.authenticated = False
            st.rerun()

    if page == "📋 Kelola Post":
        manage_posts()
    elif page == "🎨 Template":
        template_page()
    elif page == "📢 Kelola Iklan":
        ads_management_page()
    elif page == "🚀 Deploy":
        deploy_page()
    elif page == "⏰ Auto Generator":
        from scheduler_manager import SchedulerManager
        scheduler_manager = SchedulerManager()
        scheduler_manager.render_scheduler_interface()
    elif page == "⚙️ Settings":
        settings_page()

def manage_posts():
    """Interface untuk mengelola posts"""
    st.header("📋 Kelola Postingan")

    # Tab untuk manual dan AI generation
    tab1, tab2 = st.tabs(["✍️ Manual Post", "🤖 AI Generated Post"])

    with tab2:
        ai_post_generator()

    with tab1:
        manual_post_form()

    # Filter section
    st.subheader("🔍 Filter & Pencarian")

    col1, col2, col3 = st.columns(3)

    with col1:
        # Get all unique categories
        all_categories = list(set([post.get('category', 'Tanpa Kategori') for post in st.session_state.posts]))
        selected_category = st.selectbox(
            "Filter berdasarkan Kategori:",
            options=["Semua Kategori"] + sorted(all_categories)
        )

    with col2:
        # Get all unique tags
        all_tags = []
        for post in st.session_state.posts:
            if post.get('tags'):
                all_tags.extend(post['tags'])
        unique_tags = list(set(all_tags))

        selected_tag = st.selectbox(
            "Filter berdasarkan Tag:",
            options=["Semua Tags"] + sorted(unique_tags)
        )

    with col3:
        search_query = st.text_input(
            "🔍 Cari berdasarkan judul:",
            placeholder="Masukkan kata kunci..."
        )

    # Apply filters
    filtered_posts = st.session_state.posts.copy()

    if selected_category != "Semua Kategori":
        filtered_posts = [p for p in filtered_posts if p.get('category') == selected_category]

    if selected_tag != "Semua Tags":
        filtered_posts = [p for p in filtered_posts if p.get('tags') and selected_tag in p['tags']]

    if search_query:
        filtered_posts = [p for p in filtered_posts if search_query.lower() in p['title'].lower()]

    # Show stats
    st.info(f"📊 Menampilkan {len(filtered_posts)} dari {len(st.session_state.posts)} total postingan")

    # Daftar posts yang ada
    st.subheader("📚 Daftar Postingan")

    if filtered_posts:
        for i, post in enumerate(filtered_posts):
            with st.container():
                # Format tags untuk display
                tags_display = ""
                if post.get('tags'):
                    tags_display = " | ".join([f"#{tag}" for tag in post['tags']])

                category_display = post.get('category', 'Tanpa Kategori')

                st.markdown(f"""
                <div class="blog-card">
                    <h3>{post['title']}</h3>
                    <p><strong>ID:</strong> {post['id']} | <strong>Tanggal:</strong> {post['date']} | <strong>Penulis:</strong> {post['author']}</p>
                    <p><strong>🏷️ Kategori:</strong> {category_display}</p>
                    {f'<p><strong>🏷️ Tags:</strong> {tags_display}</p>' if tags_display else ''}
                    <p>{post['excerpt'][:100]}...</p>
                </div>
                """, unsafe_allow_html=True)

                col1, col2, col3 = st.columns([1, 1, 3])
                with col1:
                    if st.button(f"🗑️ Hapus", key=f"delete_{i}"):
                        st.session_state.posts.pop(i)
                        st.rerun()
                with col2:
                    if st.button(f"👁️ Preview", key=f"preview_{i}"):
                        st.session_state[f"show_preview_{i}"] = not st.session_state.get(f"show_preview_{i}", False)

                # Show preview if toggled
                if st.session_state.get(f"show_preview_{i}", False):
                    st.markdown("**Preview Konten:**")
                    # Convert markdown to HTML for preview
                    if MARKDOWN_AVAILABLE:
                        html_content = markdown.markdown(post['content'])
                        st.markdown(html_content, unsafe_allow_html=True)
                    else:
                        # Simple preview without markdown
                        st.text(post['content'][:500] + "..." if len(post['content']) > 500 else post['content'])
    else:
        st.info("📝 Belum ada postingan. Tambahkan post pertama Anda!")

def ai_post_generator():
    """Interface untuk generate post menggunakan AI"""
    st.subheader("🤖 Generate Post dengan AI")

    if not GEMINI_AVAILABLE:
        st.error("❌ Gemini AI tidak tersedia. Install dependencies yang diperlukan.")
        return

    # Tab untuk single dan bulk generation
    tab1, tab2 = st.tabs(["🔹 Single Article", "📝 Bulk Articles"])

    with tab1:
        single_article_form()

    with tab2:
        bulk_articles_form()

def single_article_form():
    """Form untuk generate single article"""
    with st.form("ai_post_form"):
        col1, col2 = st.columns(2)

        with col1:
            keyword = st.text_input(
                "🔍 Keyword/Topik:",
                placeholder="Contoh: teknologi AI, resep masakan, tips kesehatan",
                help="Masukkan topik yang ingin dijadikan artikel"
            )

            language = st.selectbox(
                "🌐 Bahasa:",
                options=["id", "en"],
                format_func=lambda x: "🇮🇩 Indonesia" if x == "id" else "🇺🇸 English"
            )

            author = st.text_input("✍️ Penulis:", value="AI Assistant")

            category = st.selectbox(
                "🏷️ Kategori:",
                options=["Teknologi", "Bisnis", "Lifestyle", "Tutorial", "Berita", "Review", "Tips", "Lainnya"],
                help="Kategori utama untuk artikel yang dihasilkan"
            )

            writing_style = st.selectbox(
                "🖋️ Gaya Penulisan:",
                options=[
                    "Formal", "Informal", "Lucu", "Serius", "Informatif", 
                    "Persuasif", "Naratif", "Deskriptif", "Argumentatif", 
                    "Opini", "Tutorial", "Review", "Listicle", "Storytelling", 
                    "Akademik", "Jurnalistik", "Kreatif", "Motivasi", "Analitis", "Conversational"
                ],
                help="Pilih gaya penulisan untuk artikel"
            )

        with col2:
            include_images = st.checkbox("🖼️ Sertakan Gambar", value=True)

            if include_images:
                max_images = st.slider("Jumlah Gambar:", 1, 5, 3)
                image_keyword = st.text_input(
                    "🔍 Keyword Gambar (opsional):",
                    placeholder="Kosongkan untuk menggunakan keyword utama"
                )

            custom_post_id = st.text_input(
                "🆔 Custom Post ID (opsional):",
                placeholder="Akan di-generate otomatis jika kosong"
            )

        generate_btn = st.form_submit_button("🚀 Generate Post", use_container_width=True)

        if generate_btn:
            if keyword:
                generate_ai_post(keyword, language, author, category, writing_style, include_images,
                               max_images if include_images else 0,
                               image_keyword if include_images else "",
                               custom_post_id)
            else:
                st.error("❌ Keyword/topik harus diisi!")

def bulk_articles_form():
    """Form untuk generate bulk articles"""
    st.info("💡 Generate multiple articles sekaligus dengan sistem rotasi API key untuk menghindari limit.")

    with st.form("bulk_ai_form"):
        # Bulk keywords input
        keywords_input = st.text_area(
            "📝 Daftar Keywords/Topik:",
            placeholder="Masukkan keywords, satu per baris:\nteknologi AI terbaru\nresep masakan sehat\ntips produktivitas kerja\nstrategi marketing digital",
            height=150,
            help="Masukkan satu keyword per baris. Maksimal 50 keywords."
        )

        col1, col2, col3 = st.columns(3)

        with col1:
            bulk_language = st.selectbox(
                "🌐 Bahasa:",
                options=["id", "en"],
                format_func=lambda x: "🇮🇩 Indonesia" if x == "id" else "🇺🇸 English",
                key="bulk_language"
            )

            bulk_author = st.text_input("✍️ Penulis:", value="AI Assistant", key="bulk_author")

        with col2:
            bulk_category = st.selectbox(
                "🏷️ Kategori:",
                options=["Teknologi", "Bisnis", "Lifestyle", "Tutorial", "Berita", "Review", "Tips", "Lainnya"],
                help="Kategori utama untuk semua artikel",
                key="bulk_category"
            )

            bulk_include_images = st.checkbox("🖼️ Sertakan Gambar", value=False, key="bulk_images")

        with col3:
            bulk_writing_style = st.selectbox(
                "🖋️ Gaya Penulisan:",
                options=[
                    "Formal", "Informal", "Lucu", "Serius", "Informatif", 
                    "Persuasif", "Naratif", "Deskriptif", "Argumentatif", 
                    "Opini", "Tutorial", "Review", "Listicle", "Storytelling", 
                    "Akademik", "Jurnalistik", "Kreatif", "Motivasi", "Analitis", "Conversational"
                ],
                help="Pilih gaya penulisan untuk semua artikel",
                key="bulk_writing_style"
            )
            if bulk_include_images:
                bulk_max_images = st.slider("Jumlah Gambar per artikel:", 1, 3, 1, key="bulk_max_images")

            delay_between_requests = st.slider(
                "⏱️ Delay antar request (detik):",
                min_value=1,
                max_value=10,
                value=3,
                help="Jeda antar request untuk menghindari rate limiting"
            )

        # API Key management
        st.markdown("---")
        st.subheader("🔑 Manajemen API Keys")

        col4, col5 = st.columns(2)

        with col4:
            additional_api_keys = st.text_area(
                "📋 API Keys Tambahan:",
                placeholder="Masukkan API keys tambahan (opsional)\nSatu API key per baris",
                height=100,
                help="API keys tambahan untuk rotasi. Akan dikombinasi dengan apikey.txt"
            )

        with col5:
            show_api_status = st.checkbox("📊 Tampilkan status API keys", value=True)

            if show_api_status and GEMINI_AVAILABLE:
                try:
                    test_gemini = GeminiScraper()
                    key_info = test_gemini.get_current_key_info()
                    st.info(f"🔑 Total API keys: {key_info['total_keys']}\n📍 Current: {key_info['key_preview']}")
                    test_gemini.close()
                except:
                    st.warning("⚠️ Tidak dapat memuat API keys")

        bulk_generate_btn = st.form_submit_button("🚀 Generate Bulk Articles", use_container_width=True)

        if bulk_generate_btn:
            if keywords_input.strip():
                keywords_list = [k.strip() for k in keywords_input.strip().split('\n') if k.strip()]

                if len(keywords_list) > 50:
                    st.error("❌ Maksimal 50 keywords per batch!")
                elif len(keywords_list) == 0:
                    st.error("❌ Masukkan minimal 1 keyword!")
                else:
                    # Add additional API keys to temporary file if provided
                    temp_api_keys = []
                    if additional_api_keys.strip():
                        temp_api_keys = [k.strip() for k in additional_api_keys.strip().split('\n') if k.strip()]

                    generate_bulk_articles(
                        keywords_list,
                        bulk_language,
                        bulk_author,
                        bulk_category,
                        bulk_writing_style,
                        bulk_include_images,
                        bulk_max_images if bulk_include_images else 0,
                        delay_between_requests,
                        temp_api_keys
                    )
            else:
                st.error("❌ Daftar keywords harus diisi!")

def generate_ai_post(keyword, language, author, category, writing_style, include_images, max_images, image_keyword, custom_post_id):
    """Generate post menggunakan AI"""

    progress_bar = st.progress(0)
    status_text = st.empty()

    try:
        # Step 1: Initialize Gemini
        status_text.text("🤖 Menginisialisasi Gemini AI...")
        progress_bar.progress(10)

        gemini = GeminiScraper()

        # Step 2: Generate content
        status_text.text("✍️ Menghasilkan konten artikel...")
        progress_bar.progress(30)

        article_content = gemini.generate_article(keyword, language, writing_style)

        if not article_content:
            st.error("❌ Gagal menghasilkan konten artikel. Coba lagi.")
            return

        # Step 3: Extract title and content
        status_text.text("📝 Memproses konten...")
        progress_bar.progress(50)

        # Extract title from content (first line or first heading)
        lines = article_content.split('\n')
        title = keyword  # Default title
        content_start = 0

        for i, line in enumerate(lines):
            if line.strip():
                # Check if it's a heading
                if line.startswith('#'):
                    title = line.replace('#', '').strip()
                    content_start = i + 1
                    break
                elif len(line.strip()) < 100:  # Likely a title
                    title = line.strip()
                    content_start = i + 1
                    break

        # Get content without title
        content = '\n'.join(lines[content_start:]).strip()

        # Generate post ID
        post_id = custom_post_id if custom_post_id else generate_post_id(title)

        # Step 4: Get images if requested
        image_urls = []
        if include_images and BING_AVAILABLE:
            status_text.text("🖼️ Mencari gambar...")
            progress_bar.progress(70)

            try:
                bing_scraper = BingImageScraper()
                search_query = image_keyword if image_keyword else keyword
                image_urls = bing_scraper.get_image_urls(search_query, max_images)
                bing_scraper.close()

                if image_urls:
                    st.success(f"✅ Ditemukan {len(image_urls)} gambar")
                else:
                    st.warning("⚠️ Tidak ada gambar yang ditemukan")

            except Exception as e:
                st.warning(f"⚠️ Error saat mencari gambar: {str(e)}")

        # Step 5: Insert images into content
        if image_urls:
            status_text.text("🎨 Menyisipkan gambar ke konten...")
            progress_bar.progress(85)

            content = insert_images_to_content(content, image_urls, keyword)

        # Step 6: Create post
        status_text.text("💾 Menyimpan post...")
        progress_bar.progress(95)

        # Extract excerpt
        excerpt = extract_excerpt_from_content(content)

        # Generate auto tags from keyword and title
        auto_tags = generate_auto_tags(keyword, title, category)

        new_post = {
            "id": post_id,
            "title": title,
            "author": author,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "excerpt": excerpt,
            "content": content,
            "category": category,
            "tags": auto_tags,
            "generated_by": "AI",
            "keyword": keyword,
            "language": language
        }

        st.session_state.posts.append(new_post)

        # Step 7: Complete
        progress_bar.progress(100)
        status_text.text("✅ Post berhasil di-generate!")

        st.success("🎉 Post AI berhasil dibuat!")
        st.balloons()

        # Show preview
        with st.expander("👁️ Preview Post", expanded=True):
            st.markdown(f"**Judul:** {title}")
            st.markdown(f"**ID:** {post_id}")
            st.markdown(f"**Kategori:** {category}")
            st.markdown(f"**Tags:** {', '.join(auto_tags)}")
            st.markdown(f"**Excerpt:** {excerpt}")
            st.markdown("**Konten:**")
            st.markdown(content[:500] + "..." if len(content) > 500 else content)

        gemini.close()

    except Exception as e:
        st.error(f"❌ Error saat generate post: {str(e)}")
        progress_bar.empty()
        status_text.empty()

def generate_auto_tags(keyword, title, category):
    """Generate automatic tags from keyword, title, and category"""
    tags = []

    # Add category as a tag
    tags.append(category.lower())

    # Extract words from keyword
    keyword_words = keyword.lower().split()
    for word in keyword_words:
        if len(word) > 3:  # Only words longer than 3 characters
            tags.append(word)

    # Extract meaningful words from title
    title_words = title.lower().split()
    for word in title_words:
        if len(word) > 4 and word not in tags:  # Avoid duplicates
            tags.append(word)

    # Limit to 5 tags and remove duplicates
    tags = list(dict.fromkeys(tags))[:5]
    return tags

def insert_images_to_content(content, image_urls, keyword):
    """Insert images into content at strategic positions"""
    if not image_urls:
        return content

    lines = content.split('\n')
    new_lines = []
    image_index = 0

    # Insert first image after introduction (first paragraph)
    paragraph_count = 0

    for i, line in enumerate(lines):
        new_lines.append(line)

        # Check if this is end of a paragraph
        if line.strip() and i < len(lines) - 1 and not lines[i + 1].strip():
            paragraph_count += 1

            # Insert image after first paragraph, then every 3 paragraphs
            if (paragraph_count == 1 or paragraph_count % 3 == 0) and image_index < len(image_urls):
                new_lines.append("")  # Empty line
                new_lines.append(f'<img src="{image_urls[image_index]}" alt="{keyword}" style="width: 100%; max-width: 600px; height: auto; border-radius: 8px; margin: 1rem 0;">')
                new_lines.append("")  # Empty line
                image_index += 1

    return '\n'.join(new_lines)

def manual_post_form():
    """Form untuk membuat post manual"""
    st.subheader("✍️ Buat Post Manual")

    # Form untuk post baru
    with st.expander("➕ Tambah Post Baru", expanded=False):
        with st.form("new_post"):
            col1, col2 = st.columns(2)

            with col1:
                title = st.text_input("Judul Post:")
                author = st.text_input("Penulis:", value="Admin")

            with col2:
                post_id = st.text_input("ID Post:", placeholder="contoh: post-1")
                date = st.date_input("Tanggal:", value=datetime.now())

            # Kategori dan Label
            col3, col4 = st.columns(2)

            with col3:
                category = st.selectbox(
                    "🏷️ Kategori:",
                    options=["Teknologi", "Bisnis", "Lifestyle", "Tutorial", "Berita", "Review", "Tips", "Lainnya"],
                    help="Pilih kategori utama untuk artikel"
                )

            with col4:
                tags_input = st.text_input(
                    "🏷️ Tags/Label:",
                    placeholder="react, javascript, web development",
                    help="Pisahkan dengan koma untuk multiple tags"
                )

            excerpt = st.text_area("Excerpt/Ringkasan:", height=100)
            content = st.text_area("Konten Post:", height=300)

            if st.form_submit_button("💾 Simpan Post", use_container_width=True):
                if title and post_id and content:
                    # Process tags
                    tags = []
                    if tags_input:
                        tags = [tag.strip() for tag in tags_input.split(",") if tag.strip()]

                    new_post = {
                        "id": post_id,
                        "title": title,
                        "author": author,
                        "date": date.strftime("%Y-%m-%d"),
                        "excerpt": excerpt,
                        "content": content.replace("\n", "<br>"),
                        "category": category,
                        "tags": tags
                    }
                    st.session_state.posts.append(new_post)
                    st.success("✅ Post berhasil ditambahkan!")
                    st.rerun()
                else:
                    st.error("❌ Judul, ID, dan Konten wajib diisi!")

def generate_bulk_articles(keywords_list, language, author, category, writing_style, include_images, max_images, delay, additional_api_keys):
    """Generate multiple articles in bulk with API key rotation"""

    # Setup progress tracking
    total_keywords = len(keywords_list)
    progress_bar = st.progress(0)
    status_container = st.container()
    results_container = st.container()

    successful_posts = []
    failed_keywords = []

    with status_container:
        st.info(f"🚀 Memulai generation {total_keywords} artikel...")
        current_status = st.empty()
        api_status = st.empty()

    try:
        # Setup Gemini with additional API keys if provided
        if additional_api_keys:
            # Temporarily write additional keys to a temp file
            import tempfile
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as temp_file:
                # Read existing keys first
                existing_keys = []
                if os.path.exists('apikey.txt'):
                    with open('apikey.txt', 'r') as f:
                        existing_keys = [line.strip() for line in f if line.strip()]

                # Combine all keys
                all_keys = list(set(existing_keys + additional_api_keys))

                # Write to temp file
                temp_file.write('\n'.join(all_keys))
                temp_file_path = temp_file.name

            # Backup original file
            original_backup = None
            if os.path.exists('apikey.txt'):
                with open('apikey.txt', 'r') as f:
                    original_backup = f.read()

            # Replace with combined keys
            with open('apikey.txt', 'w') as f:
                f.write('\n'.join(all_keys))

        # Initialize Gemini scraper
        gemini = GeminiScraper()

        for i, keyword in enumerate(keywords_list):
            current_progress = (i / total_keywords)
            progress_bar.progress(current_progress)

            with current_status:
                st.text(f"🔄 Processing {i+1}/{total_keywords}: {keyword[:50]}...")

            # Show current API key info
            key_info = gemini.get_current_key_info()
            with api_status:
                st.text(f"🔑 Using API key {key_info['current_index'] + 1}/{key_info['total_keys']} ({key_info['key_preview']})")

            try:
                # Generate article
                article_content = gemini.generate_article(keyword, language, writing_style)

                if article_content:
                    # Process content similar to single article generation
                    lines = article_content.split('\n')
                    title = keyword  # Default title
                    content_start = 0

                    for j, line in enumerate(lines):
                        if line.strip():
                            if line.startswith('#'):
                                title = line.replace('#', '').strip()
                                content_start = j + 1
                                break
                            elif len(line.strip()) < 100:
                                title = line.strip()
                                content_start = j + 1
                                break

                    content = '\n'.join(lines[content_start:]).strip()
                    post_id = generate_post_id(title)

                    # Handle images if requested
                    image_urls = []
                    if include_images and BING_AVAILABLE:
                        try:
                            bing_scraper = BingImageScraper()
                            image_urls = bing_scraper.get_image_urls(keyword, max_images)
                            bing_scraper.close()

                            if image_urls:
                                content = insert_images_to_content(content, image_urls, keyword)
                        except Exception as img_error:
                            with results_container:
                                st.warning(f"⚠️ {keyword}: Gagal menambah gambar - {str(img_error)}")

                    # Create post
                    excerpt = extract_excerpt_from_content(content)
                    auto_tags = generate_auto_tags(keyword, title, category)

                    new_post = {
                        "id": post_id,
                        "title": title,
                        "author": author,
                        "date": datetime.now().strftime("%Y-%m-%d"),
                        "excerpt": excerpt,
                        "content": content,
                        "category": category,
                        "tags": auto_tags,
                        "generated_by": "AI_Bulk",
                        "keyword": keyword,
                        "language": language
                    }

                    st.session_state.posts.append(new_post)
                    successful_posts.append(keyword)

                    with results_container:
                        st.success(f"✅ {i+1}/{total_keywords}: {title}")

                else:
                    failed_keywords.append(keyword)
                    with results_container:
                        st.error(f"❌ {i+1}/{total_keywords}: Gagal generate - {keyword}")

            except Exception as e:
                failed_keywords.append(keyword)
                with results_container:
                    st.error(f"❌ {i+1}/{total_keywords}: Error - {keyword}: {str(e)}")

            # Delay between requests
            if i < total_keywords - 1:  # Don't delay after last request
                import time
                time.sleep(delay)

        # Final progress
        progress_bar.progress(1.0)

        # Show final results
        with current_status:
            st.text("✅ Bulk generation selesai!")

        # Summary
        with results_container:
            st.markdown("---")
            st.subheader("📊 Ringkasan Hasil")

            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("✅ Berhasil", len(successful_posts))
            with col2:
                st.metric("❌ Gagal", len(failed_keywords))
            with col3:
                st.metric("📈 Success Rate", f"{(len(successful_posts)/total_keywords)*100:.1f}%")

            if failed_keywords:
                st.error("❌ Keywords yang gagal:")
                for keyword in failed_keywords:
                    st.text(f"• {keyword}")

            if successful_posts:
                st.success(f"🎉 Berhasil generate {len(successful_posts)} artikel!")
                st.balloons()

        gemini.close()

    except Exception as e:
        with results_container:
            st.error(f"❌ Error during bulk generation: {str(e)}")

    finally:
        # Restore original API keys file if we modified it
        if additional_api_keys and 'original_backup' in locals() and original_backup is not None:
            with open('apikey.txt', 'w') as f:
                f.write(original_backup)
        elif additional_api_keys and 'original_backup' in locals() and original_backup is None:
            # Remove the file if it didn't exist before
            if os.path.exists('apikey.txt'):
                os.remove('apikey.txt')

        # Clean up temp file
        if additional_api_keys and 'temp_file_path' in locals():
            try:
                os.unlink(temp_file_path)
            except:
                pass

def template_page():
    """Halaman untuk memilih template"""
    from templates import get_template_config

    st.header("🎨 Pilih Template Blog")

    st.info("💡 Pilih template yang sesuai dengan gaya blog Anda. Setiap template memiliki design dan layout yang berbeda.")

    templates = get_template_config()

    # Show current selection
    current_template = st.session_state.get('selected_template', 'modern')
    st.success(f"✅ Template saat ini: **{templates[current_template]['name']}**")

    st.markdown("---")

    # Template selection - Row 1
    col1, col2, col3 = st.columns(3)

    with col1:
        st.markdown(f"""
        <div style="border: {'3px solid #4CAF50' if current_template == 'modern' else '1px solid #ddd'}; border-radius: 10px; padding: 1rem; text-align: center; background: {'#f0fff0' if current_template == 'modern' else 'white'};">
            <h3>🎨 Modern Clean</h3>
            <p><strong>Design:</strong> Minimalis & Clean</p>
            <p><strong>Cocok untuk:</strong> Blog personal, portfolio</p>
            <p><strong>Fitur:</strong> Layout simple, fokus konten</p>
        </div>
        """, unsafe_allow_html=True)

        if st.button("🎨 Pilih Modern", key="modern_btn", use_container_width=True):
            st.session_state.selected_template = "modern"
            st.success("✅ Template Modern dipilih!")
            st.rerun()

    with col2:
        st.markdown(f"""
        <div style="border: {'3px solid #4CAF50' if current_template == 'magazine' else '1px solid #ddd'}; border-radius: 10px; padding: 1rem; text-align: center; background: {'#f0fff0' if current_template == 'magazine' else 'white'};">
            <h3>📰 Magazine Style</h3>
            <p><strong>Design:</strong> Layout berita & majalah</p>
            <p><strong>Cocok untuk:</strong> Blog berita, media</p>
            <p><strong>Fitur:</strong> Sidebar kaya, breaking news</p>
        </div>
        """, unsafe_allow_html=True)

        if st.button("📰 Pilih Magazine", key="magazine_btn", use_container_width=True):
            st.session_state.selected_template = "magazine"
            st.success("✅ Template Magazine dipilih!")
            st.rerun()

    with col3:
        st.markdown(f"""
        <div style="border: {'3px solid #4CAF50' if current_template == 'corporate' else '1px solid #ddd'}; border-radius: 10px; padding: 1rem; text-align: center; background: {'#f0fff0' if current_template == 'corporate' else 'white'};">
            <h3>💼 Corporate Professional</h3>
            <p><strong>Design:</strong> Formal & profesional</p>
            <p><strong>Cocok untuk:</strong> Blog bisnis, perusahaan</p>
            <p><strong>Fitur:</strong> Contact info, CTA buttons</p>
        </div>
        """, unsafe_allow_html=True)

        if st.button("💼 Pilih Corporate", key="corporate_btn", use_container_width=True):
            st.session_state.selected_template = "corporate"
            st.success("✅ Template Corporate dipilih!")
            st.rerun()

    # Template selection - Row 2
    st.markdown("<br>", unsafe_allow_html=True)
    col4, col5, col6 = st.columns(3)

    with col4:
        st.markdown(f"""
        <div style="border: {'3px solid #4CAF50' if current_template == 'business' else '1px solid #ddd'}; border-radius: 10px; padding: 1rem; text-align: center; background: {'#f0fff0' if current_template == 'business' else 'white'};">
            <h3>🏢 Business Solutions</h3>
            <p><strong>Design:</strong> Profesional dengan SEO optimal</p>
            <p><strong>Cocok untuk:</strong> Konsultan, B2B, layanan</p>
            <p><strong>Fitur:</strong> CTA kuat, services grid</p>
        </div>
        """, unsafe_allow_html=True)

        if st.button("🏢 Pilih Business", key="business_btn", use_container_width=True):
            st.session_state.selected_template = "business"
            st.success("✅ Template Business dipilih!")
            st.rerun()

    with col5:
        st.markdown(f"""
        <div style="border: {'3px solid #4CAF50' if current_template == 'tech' else '1px solid #ddd'}; border-radius: 10px; padding: 1rem; text-align: center; background: {'#f0fff0' if current_template == 'tech' else 'white'};">
            <h3>🚀 Tech Insights</h3>
            <p><strong>Design:</strong> Modern dengan animasi</p>
            <p><strong>Cocok untuk:</strong> Tech blog, programming</p>
            <p><strong>Fitur:</strong> Code-friendly, tech categories</p>
        </div>
        """, unsafe_allow_html=True)

        if st.button("🚀 Pilih Tech", key="tech_btn", use_container_width=True):
            st.session_state.selected_template = "tech"
            st.success("✅ Template Tech dipilih!")
            st.rerun()

    with col6:
        st.markdown(f"""
        <div style="border: {'3px solid #4CAF50' if current_template == 'minimal' else '1px solid #ddd'}; border-radius: 10px; padding: 1rem; text-align: center; background: {'#f0fff0' if current_template == 'minimal' else 'white'};">
            <h3>🎯 Minimal Portfolio</h3>
            <p><strong>Design:</strong> Ultra clean & typography</p>
            <p><strong>Cocok untuk:</strong> Writer, artist, designer</p>
            <p><strong>Fitur:</strong> Focus konten, loading cepat</p>
        </div>
        """, unsafe_allow_html=True)

        if st.button("🎯 Pilih Minimal", key="minimal_btn", use_container_width=True):
            st.session_state.selected_template = "minimal"
            st.success("✅ Template Minimal dipilih!")
            st.rerun()

    st.markdown("---")

    # Template Preview
    st.subheader("🔍 Preview Template")
    selected_template_config = templates[current_template]

    st.markdown(f"""
    ### {selected_template_config['name']}
    **Deskripsi:** {selected_template_config['description']}

    **Preview:** {selected_template_config['preview']}

    **Template ini akan digunakan saat deploy blog Anda ke Cloudflare Worker.**
    """)

    # Template Features
    if current_template == "modern":
        st.markdown("""
        **Fitur Template Modern:**
        - ✨ Design minimalis dan clean
        - 📱 Fully responsive
        - 🎨 Color scheme yang elegan
        - 📝 Fokus pada readability
        - 🔍 Sidebar sederhana
        - 📢 Ruang iklan terintegrasi
        """)
    elif current_template == "magazine":
        st.markdown("""
        **Fitur Template Magazine:**
        - 📰 Layout seperti portal berita
        - 🚨 Breaking news ticker
        - 📈 Widget trending articles
        - 📧 Newsletter subscription
        - 🏷️ Tag dan kategori lengkap
        - 📢 Multiple ad placement
        """)
    elif current_template == "corporate":
        st.markdown("""
        **Fitur Template Corporate:**
        - 💼 Design profesional untuk bisnis
        - 📞 Contact information di header
        - 🎯 Call-to-action sections
        - 🏢 Company info widget
        - 📊 Business-focused layout
        - 📢 Premium ad placement
        """)
    elif current_template == "business":
        st.markdown("""
        **Fitur Template Business:**
        - 🏢 Hero banner dengan CTA kuat
        - 📊 Services grid showcase
        - 🎯 Contact consultation sections
        - 📈 Featured insights layout
        - 🔍 SEO optimized dengan sitemap
        - 📢 Strategic ad placement
        """)
    elif current_template == "tech":
        st.markdown("""
        **Fitur Template Tech:**
        - 🚀 Animated hero section
        - 💻 Tech categories dengan icons
        - 🎨 Modern gradient design
        - 📝 Code-friendly content layout
        - 🔗 Social sharing buttons
        - 📱 Mobile-first responsive
        """)
    elif current_template == "minimal":
        st.markdown("""
        **Fitur Template Minimal:**
        - 🎯 Ultra clean typography
        - ⚡ Fast loading performance
        - 📖 Reading-focused layout
        - 🎨 Elegant serif fonts
        - 📧 Simple sharing options
        - 🔍 Clean navigation
        """)

def deploy_page():
    """Halaman untuk deploy worker dengan opsi terpisah"""
    st.header("🚀 Deploy Blog")

    from templates import get_template_config

    templates = get_template_config()
    current_template = st.session_state.get('selected_template', 'modern')
    template_name = templates[current_template]['name']

    st.info(f"Worker akan di-deploy ke: **https://{st.session_state.worker_subdomain}**")
    st.info(f"🎨 Template yang digunakan: **{template_name}**")

    # Tab untuk memisahkan deploy
    tab1, tab2, tab3 = st.tabs(["🚀 Deploy Lengkap", "📝 Deploy Artikel Saja", "🎨 Deploy Template Saja"])

    with tab1:
        st.subheader("🚀 Deploy Lengkap (Template + Artikel)")
        st.write("Deploy template dan semua artikel sekaligus.")

        if st.session_state.posts:
            st.subheader("📋 Preview Posts")
            for post in st.session_state.posts:
                st.markdown(f"• **{post['title']}** (ID: {post['id']})")

            st.markdown("---")

            if st.button("🚀 Deploy Lengkap Sekarang", type="primary", use_container_width=True):
                with st.spinner("⏳ Deploying worker lengkap..."):
                    worker_script = generate_worker_script()

                    if deploy_worker(worker_script):
                        st.success("✅ Worker lengkap berhasil di-deploy!")
                        st.balloons()
                        st.markdown(f"🌍 Blog Anda live di: https://{st.session_state.worker_subdomain}")
                    else:
                        st.error("❌ Deploy gagal! Periksa konfigurasi Cloudflare.")
        else:
            st.warning("⚠️ Tidak ada postingan untuk di-deploy. Tambahkan post terlebih dahulu.")

    with tab2:
        st.subheader("📝 Deploy Artikel Saja")
        st.write("Update hanya data artikel tanpa mengubah template yang sudah ada.")

        if st.session_state.posts:
            st.info("💡 Ini akan mengupdate hanya data artikel di worker yang sudah ada. Template tetap menggunakan yang sebelumnya.")

            st.subheader("📋 Artikel yang akan di-update:")
            for post in st.session_state.posts:
                st.markdown(f"• **{post['title']}** (ID: {post['id']})")

            if st.button("📝 Update Artikel", type="secondary", use_container_width=True):
                with st.spinner("⏳ Updating artikel..."):
                    if deploy_articles_only():
                        st.success("✅ Artikel berhasil di-update!")
                        st.markdown(f"🌍 Lihat perubahan di: https://{st.session_state.worker_subdomain}")
                    else:
                        st.error("❌ Update artikel gagal! Periksa konfigurasi Cloudflare.")
        else:
            st.warning("⚠️ Tidak ada artikel untuk di-update.")

    with tab3:
        st.subheader("🎨 Deploy Template Saja")
        st.write("Update hanya template/desain tanpa mengubah artikel yang sudah ada.")

        st.info("💡 Ini akan mengupdate hanya template/desain di worker. Artikel yang sudah ada akan tetap dipertahankan.")

        st.markdown(f"""
        **Template yang akan digunakan:** {template_name}

        **Perubahan yang akan diterapkan:**
        - Design dan layout baru
        - Konfigurasi iklan terbaru
        - CSS dan JavaScript terbaru
        - Artikel existing tetap dipertahankan
        """)

        if st.button("🎨 Update Template", type="secondary", use_container_width=True):
            with st.spinner("⏳ Updating template..."):
                if deploy_template_only():
                    st.success("✅ Template berhasil di-update!")
                    st.markdown(f"🌍 Lihat perubahan di: https://{st.session_state.worker_subdomain}")
                else:
                    st.error("❌ Update template gagal! Periksa konfigurasi Cloudflare.")

def settings_page():
    """Halaman pengaturan"""
    st.header("⚙️ Pengaturan")

    with st.form("settings_form"):
        st.subheader("🔧 Konfigurasi Cloudflare")

        new_account_id = st.text_input("Account ID:", value=st.session_state.cf_account_id)
        new_api_token = st.text_input("API Token:", value=st.session_state.cf_api_token, type="password")
        new_worker_name = st.text_input("Worker Name:", value=st.session_state.worker_name)

        if st.form_submit_button("💾 Update Konfigurasi"):
            if new_account_id and new_api_token and new_worker_name:
                if test_cloudflare_connection(new_account_id, new_api_token):
                    account_name = get_account_name(new_account_id, new_api_token)
                    if account_name:
                        account_subdomain = format_account_name(account_name)
                        full_worker_url = f"{new_worker_name}.{account_subdomain}.workers.dev"

                        st.session_state.cf_account_id = new_account_id
                        st.session_state.cf_api_token = new_api_token
                        st.session_state.worker_name = new_worker_name
                        st.session_state.worker_subdomain = full_worker_url
                        st.session_state.account_name = account_name
                        st.success("✅ Konfigurasi berhasil diupdate!")
                    else:
                        st.error("❌ Gagal mengambil nama akun.")
                else:
                    st.error("❌ Koneksi ke Cloudflare gagal.")
            else:
                st.error("❌ Semua field harus diisi!")

    st.markdown("---")

    # Custom Domain Settings
    st.subheader("🌐 Custom Domain Settings")

    # Check if user has connected domains
    if st.session_state.cf_account_id and st.session_state.cf_api_token:
        connected_domains = get_connected_domains()

        if connected_domains:
            st.success(f"✅ Domain terkoneksi: **{', '.join(connected_domains)}**")
            st.info("💡 Anda dapat membuat subdomain dari domain yang sudah terkoneksi")

            # Subdomain creator
            with st.form("subdomain_form"):
                st.write("**Buat Subdomain Baru:**")

                selected_domain = st.selectbox("Pilih Domain:", connected_domains)
                subdomain_name = st.text_input("Nama Subdomain:", placeholder="blog")

                if st.form_submit_button("🚀 Buat Subdomain"):
                    if subdomain_name and selected_domain:
                        full_subdomain = f"{subdomain_name}.{selected_domain}"

                        with st.spinner(f"⏳ Membuat subdomain {full_subdomain}..."):
                            if create_subdomain_route(subdomain_name, selected_domain):
                                st.success(f"✅ Subdomain berhasil dibuat: **https://{full_subdomain}**")
                                st.balloons()

                                # Update worker subdomain in session
                                st.session_state.worker_subdomain = full_subdomain

                                # Show instructions
                                st.info(f"""
                                🎉 **Subdomain aktif!**

                                Blog Anda sekarang dapat diakses di: **https://{full_subdomain}**

                                ⏱️ **Timeline Aktivasi:**
                                - DNS Record: ✅ Aktif sekarang
                                - Worker Route: ✅ Aktif sekarang
                                - DNS Propagation: 1-5 menit (global)
                                - SSL Certificate: 5-15 menit

                                🔒 **Durasi Subdomain:**
                                - **PERMANEN** - Subdomain akan aktif selama akun Cloudflare aktif
                                - Tidak ada biaya tambahan untuk subdomain
                                - Dapat dihapus/diubah kapan saja melalui dashboard Cloudflare

                                📝 **Catatan:**
                                - Pastikan untuk deploy ulang jika ada perubahan konten
                                - URL ini sekarang akan digunakan sebagai URLutama worker Anda
                                - Subdomain mendukung HTTPS otomatis dengan sertifikat SSL gratis
                                """)

                                st.rerun()
                            else:
                                st.error("❌ Gagal membuat subdomain. Periksa log error di atas.")
                    else:
                        st.error("❌ Nama subdomain dan domain harus diisi")
        else:
            st.warning("⚠️ Belum ada domain yang terkoneksi ke akun Cloudflare Anda")

        # Custom domain setup guide
        with st.expander("📖 Cara Menghubungkan Domain Custom"):
            st.markdown("""
            **Langkah-langkah menghubungkan domain custom:**

            1. **Beli Domain** di registrar seperti Namecheap, GoDaddy, atau lainnya

            2. **Tambahkan Domain ke Cloudflare:**
               - Login ke [Cloudflare Dashboard](https://dash.cloudflare.com)
               - Klik "Add Site" dan masukkan domain Anda
               - Ikuti instruksi untuk mengubah nameserver

            3. **Verifikasi Domain:**
               - Tunggu hingga status domain menjadi "Active"
               - Domain akan otomatis muncul di dashboard ini

            4. **Buat Subdomain:**
               - Gunakan form di atas untuk membuat subdomain
               - Contoh: `blog.domainanda.com`

            **Keuntungan Custom Domain:**
            - ✅ Branding yang lebih profesional
            - ✅ SEO yang lebih baik
            - ✅ Kontrol penuh atas domain
            - ✅ Tidak tergantung pada subdomain `.workers.dev`
            """)
    else:
        st.info("🔐 Hubungkan akun Cloudflare terlebih dahulu untuk mengatur custom domain")

    st.markdown("---")

    # Export/Import data
    st.subheader("📤 Export/Import Data")

    col1, col2 = st.columns(2)

    with col1:
        if st.button("📥 Export Posts"):
            if st.session_state.posts:
                posts_json = json.dumps(st.session_state.posts, indent=2)
                st.download_button(
                    label="💾 Download posts.json",
                    data=posts_json,
                    file_name="posts.json",
                    mime="application/json"
                )
            else:
                st.warning("Tidak ada posts untuk di-export")

    with col2:
        uploaded_file = st.file_uploader("📤 Import Posts", type="json")
        if uploaded_file:
            try:
                imported_posts = json.load(uploaded_file)
                st.session_state.posts = imported_posts
                st.success("✅ Posts berhasil di-import!")
                st.rerun()
            except:
                st.error("❌ File JSON tidak valid!")

    st.markdown("---")

    # AI Configuration
    st.subheader("🤖 Konfigurasi AI")

    with st.form("ai_config_form"):
        gemini_api_key = st.text_input(
            "Gemini API Key:",
            type="password",
            help="Dapatkan dari https://makersuite.google.com/app/apikey"
        )

        if st.form_submit_button("💾 Simpan Konfigurasi AI"):
            if gemini_api_key:
                # Save to environment or session state
                os.environ['GEMINI_API_KEY'] = gemini_api_key
                st.success("✅ Konfigurasi AI berhasil disimpan!")
            else:
                st.error("❌ API Key harus diisi!")

# Main app logic
def main():
    init_session_state()

    if not st.session_state.authenticated:
        authenticate()
    else:
        main_dashboard()

if __name__ == "__main__":
    main()