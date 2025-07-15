
"""
Scheduler management interface for Streamlit dashboard.
"""

import streamlit as st
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List

class SchedulerManager:
    def __init__(self, config_file="scheduler_config.json"):
        self.config_file = config_file
    
    def load_config(self) -> Dict:
        """Load scheduler configuration."""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            return self._get_default_config()
        except Exception as e:
            st.error(f"Error loading config: {str(e)}")
            return self._get_default_config()
    
    def save_config(self, config: Dict) -> bool:
        """Save scheduler configuration."""
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            st.error(f"Error saving config: {str(e)}")
            return False
    
    def _get_default_config(self) -> Dict:
        """Get default configuration."""
        return {
            "keywords": [],
            "language": "id",
            "category": "Teknologi",
            "writing_style": "informatif",
            "auto_deploy": True,
            "cf_account_id": "",
            "cf_api_token": "",
            "worker_name": "",
            "schedule": {
                "description": "Generate articles daily at 9 AM",
                "cron": "0 9 * * *"
            }
        }
    
    def render_scheduler_interface(self):
        """Render scheduler management interface."""
        st.header("⏰ Scheduled Article Generator")
        
        # Load current config
        config = self.load_config()
        
        # Tabs for different settings
        tab1, tab2, tab3, tab4 = st.tabs(["📝 Keywords & Settings", "⏰ Schedule", "🔧 Deploy Config", "📊 Status"])
        
        with tab1:
            self._render_keywords_settings(config)
        
        with tab2:
            self._render_schedule_settings(config)
        
        with tab3:
            self._render_deploy_config(config)
        
        with tab4:
            self._render_status_monitor()
    
    def _render_keywords_settings(self, config: Dict):
        """Render keywords and generation settings."""
        st.subheader("📝 Keywords dan Pengaturan Generate")
        
        with st.form("keywords_form"):
            # Keywords input
            keywords_text = st.text_area(
                "📋 Daftar Keywords:",
                value="\n".join(config.get('keywords', [])),
                height=200,
                placeholder="Masukkan keywords, satu per baris:\nteknologi AI terbaru\nresep masakan sehat\ntips produktivitas kerja",
                help="Satu keyword per baris. Maksimal 50 keywords."
            )
            
            col1, col2 = st.columns(2)
            
            with col1:
                language = st.selectbox(
                    "🌐 Bahasa:",
                    options=["id", "en"],
                    format_func=lambda x: "🇮🇩 Indonesia" if x == "id" else "🇺🇸 English",
                    index=0 if config.get('language', 'id') == 'id' else 1
                )
                
                category = st.selectbox(
                    "🏷️ Kategori:",
                    options=["Teknologi", "Bisnis", "Lifestyle", "Tutorial", "Berita", "Review", "Tips", "Lainnya"],
                    index=["Teknologi", "Bisnis", "Lifestyle", "Tutorial", "Berita", "Review", "Tips", "Lainnya"].index(config.get('category', 'Teknologi'))
                )
            
            with col2:
                writing_style = st.selectbox(
                    "🖋️ Gaya Penulisan:",
                    options=[
                        "formal", "informal", "lucu", "serius", "informatif", 
                        "persuasif", "naratif", "deskriptif", "argumentatif", 
                        "opini", "tutorial", "review", "listicle", "storytelling", 
                        "akademik", "jurnalistik", "kreatif", "motivasi", "analitis", "conversational"
                    ],
                    index=["formal", "informal", "lucu", "serius", "informatif", 
                           "persuasif", "naratif", "deskriptif", "argumentatif", 
                           "opini", "tutorial", "review", "listicle", "storytelling", 
                           "akademik", "jurnalistik", "kreatif", "motivasi", "analitis", "conversational"].index(config.get('writing_style', 'informatif'))
                )
                
                auto_deploy = st.checkbox(
                    "🚀 Auto Deploy setelah generate",
                    value=config.get('auto_deploy', True),
                    help="Otomatis deploy artikel ke Cloudflare Worker setelah generate"
                )
            
            if st.form_submit_button("💾 Simpan Pengaturan Keywords", use_container_width=True):
                keywords_list = [k.strip() for k in keywords_text.strip().split('\n') if k.strip()]
                
                if len(keywords_list) > 50:
                    st.error("❌ Maksimal 50 keywords!")
                else:
                    config['keywords'] = keywords_list
                    config['language'] = language
                    config['category'] = category
                    config['writing_style'] = writing_style
                    config['auto_deploy'] = auto_deploy
                    
                    if self.save_config(config):
                        st.success(f"✅ Pengaturan disimpan! {len(keywords_list)} keywords siap untuk generate.")
                        st.rerun()
    
    def _render_schedule_settings(self, config: Dict):
        """Render schedule configuration."""
        st.subheader("⏰ Pengaturan Jadwal")
        
        st.info("""
        💡 **Cara menggunakan Scheduled Deployment:**
        1. Konfigurasi pengaturan di tab ini
        2. Klik tombol "Deploy Scheduler" 
        3. Replit akan menjalankan scheduler sesuai jadwal yang ditentukan
        """)
        
        with st.form("schedule_form"):
            schedule_type = st.selectbox(
                "📅 Jenis Jadwal:",
                options=["Harian", "Mingguan", "Bulanan", "Custom Cron"]
            )
            
            if schedule_type == "Harian":
                hour = st.slider("Jam:", 0, 23, 9)
                minute = st.slider("Menit:", 0, 59, 0)
                cron_expression = f"{minute} {hour} * * *"
                description = f"Generate artikel setiap hari jam {hour:02d}:{minute:02d}"
                
            elif schedule_type == "Mingguan":
                day_names = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
                day_values = [1, 2, 3, 4, 5, 6, 0]  # Cron format
                
                selected_day = st.selectbox("Hari:", day_names)
                hour = st.slider("Jam:", 0, 23, 9, key="weekly_hour")
                minute = st.slider("Menit:", 0, 59, 0, key="weekly_minute")
                
                day_cron = day_values[day_names.index(selected_day)]
                cron_expression = f"{minute} {hour} * * {day_cron}"
                description = f"Generate artikel setiap {selected_day} jam {hour:02d}:{minute:02d}"
                
            elif schedule_type == "Bulanan":
                day_of_month = st.slider("Tanggal:", 1, 28, 1)  # Max 28 to avoid month issues
                hour = st.slider("Jam:", 0, 23, 9, key="monthly_hour")
                minute = st.slider("Menit:", 0, 59, 0, key="monthly_minute")
                
                cron_expression = f"{minute} {hour} {day_of_month} * *"
                description = f"Generate artikel setiap tanggal {day_of_month} jam {hour:02d}:{minute:02d}"
                
            else:  # Custom Cron
                cron_expression = st.text_input(
                    "Cron Expression:",
                    value=config.get('schedule', {}).get('cron', '0 9 * * *'),
                    help="Format: minute hour day month day_of_week"
                )
                description = st.text_input(
                    "Deskripsi:",
                    value=config.get('schedule', {}).get('description', 'Custom schedule')
                )
            
            # Show cron preview
            st.code(f"Cron Expression: {cron_expression}", language="bash")
            st.info(f"📝 {description}")
            
            if st.form_submit_button("⏰ Simpan Jadwal", use_container_width=True):
                config['schedule'] = {
                    'cron': cron_expression,
                    'description': description,
                    'type': schedule_type
                }
                
                if self.save_config(config):
                    st.success("✅ Jadwal berhasil disimpan!")
                    st.rerun()
    
    def _render_deploy_config(self, config: Dict):
        """Render deployment configuration."""
        st.subheader("🔧 Konfigurasi Deploy")
        
        # Use existing session state if available
        if hasattr(st.session_state, 'cf_account_id'):
            default_account_id = st.session_state.cf_account_id
            default_api_token = st.session_state.cf_api_token
            default_worker_name = st.session_state.worker_name
        else:
            default_account_id = config.get('cf_account_id', '')
            default_api_token = config.get('cf_api_token', '')
            default_worker_name = config.get('worker_name', '')
        
        with st.form("deploy_config_form"):
            st.info("💡 Konfigurasi ini diperlukan untuk auto-deploy artikel ke Cloudflare Worker")
            
            account_id = st.text_input(
                "Account ID Cloudflare:",
                value=default_account_id,
                type="password" if default_account_id else "default",
                help="Account ID dari dashboard Cloudflare"
            )
            
            api_token = st.text_input(
                "API Token:",
                value=default_api_token,
                type="password",
                help="API Token dengan permission Workers:Edit"
            )
            
            worker_name = st.text_input(
                "Worker Name:",
                value=default_worker_name,
                help="Nama worker yang akan di-update"
            )
            
            if st.form_submit_button("🔧 Simpan Konfigurasi Deploy", use_container_width=True):
                config['cf_account_id'] = account_id
                config['cf_api_token'] = api_token
                config['worker_name'] = worker_name
                
                if self.save_config(config):
                    st.success("✅ Konfigurasi deploy berhasil disimpan!")
                    st.rerun()
        
        # Deploy scheduler button
        st.markdown("---")
        st.subheader("🚀 Deploy Scheduler")
        
        if all([config.get('keywords'), config.get('schedule', {}).get('cron')]):
            st.success("✅ Konfigurasi lengkap! Siap untuk deploy.")
            
            col1, col2 = st.columns(2)
            
            with col1:
                if st.button("🚀 Deploy Scheduler ke Replit", use_container_width=True):
                    st.info("""
                    📋 **Langkah Deploy Scheduler:**
                    
                    1. **Simpan semua konfigurasi** (sudah ✅)
                    2. **Klik tombol Deploy** di header Replit
                    3. **Pilih "Scheduled Deployments"**
                    4. **Set schedule:** `{}`
                    5. **Set command:** `python scheduler.py`
                    6. **Add secrets** untuk Cloudflare credentials
                    7. **Deploy!**
                    
                    Scheduler akan berjalan otomatis sesuai jadwal.
                    """.format(config.get('schedule', {}).get('cron', '0 9 * * *')))
            
            with col2:
                if st.button("🧪 Test Generate Sekarang", use_container_width=True):
                    with st.spinner("⏳ Testing article generation..."):
                        try:
                            from scheduler import ScheduledArticleGenerator
                            
                            # Test dengan 1 keyword saja
                            test_keywords = config['keywords'][:1] if config['keywords'] else ["teknologi AI"]
                            
                            generator = ScheduledArticleGenerator()
                            posts = generator.generate_articles_from_keywords(
                                test_keywords,
                                config.get('language', 'id'),
                                config.get('category', 'Teknologi'),
                                config.get('writing_style', 'informatif')
                            )
                            
                            if posts:
                                st.success(f"✅ Test berhasil! Generated {len(posts)} artikel.")
                                st.json(posts[0])
                            else:
                                st.error("❌ Test gagal. Periksa API key Gemini.")
                                
                        except Exception as e:
                            st.error(f"❌ Error saat test: {str(e)}")
        else:
            st.warning("⚠️ Lengkapi konfigurasi keywords dan jadwal terlebih dahulu.")
    
    def _render_status_monitor(self):
        """Render status monitoring."""
        st.subheader("📊 Status & Monitoring")
        
        # Check if scheduler log exists
        if os.path.exists("scheduler.log"):
            st.subheader("📋 Log Scheduler")
            
            try:
                with open("scheduler.log", "r", encoding="utf-8") as f:
                    log_content = f.read()
                
                # Show recent logs
                log_lines = log_content.split('\n')[-50:]  # Last 50 lines
                st.text_area("Recent Logs:", value='\n'.join(log_lines), height=300)
                
            except Exception as e:
                st.error(f"Error reading logs: {str(e)}")
        else:
            st.info("📝 Belum ada log scheduler. Jalankan scheduler untuk melihat log.")
        
        # Check generated posts
        if os.path.exists("posts.json"):
            st.subheader("📚 Generated Posts")
            
            try:
                with open("posts.json", "r", encoding="utf-8") as f:
                    posts = json.load(f)
                
                scheduled_posts = [p for p in posts if p.get('generated_by') == 'AI_Scheduled']
                
                if scheduled_posts:
                    st.success(f"✅ {len(scheduled_posts)} artikel berhasil di-generate via scheduler")
                    
                    # Show recent posts
                    recent_posts = sorted(scheduled_posts, key=lambda x: x.get('scheduled_at', ''), reverse=True)[:5]
                    
                    for post in recent_posts:
                        with st.expander(f"📄 {post['title']} - {post.get('date', 'Unknown date')}"):
                            st.write(f"**Keyword:** {post.get('keyword', 'N/A')}")
                            st.write(f"**Category:** {post.get('category', 'N/A')}")
                            st.write(f"**Generated at:** {post.get('scheduled_at', 'N/A')}")
                            st.write(f"**Excerpt:** {post['excerpt']}")
                else:
                    st.info("📝 Belum ada artikel yang di-generate via scheduler.")
                    
            except Exception as e:
                st.error(f"Error loading posts: {str(e)}")
        else:
            st.info("📝 Belum ada file posts.json.")
