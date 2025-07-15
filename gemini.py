"""
Gemini AI content generator using official API.
This module handles interaction with Gemini AI using Google's official API.
"""

import os
import logging
from langdetect import detect, DetectorFactory
from langcodes import Language
import google.generativeai as genai
from config import Config

# Pastikan deteksi bahasa konsisten
DetectorFactory.seed = 0

class GeminiScraper:
    """Scraper for Gemini AI using official API."""
    
    def __init__(self, api_key=None):
        self.logger = logging.getLogger(__name__)
        self.config = Config()
        self.api_key = api_key
        self.api_keys = []
        self.current_key_index = 0
        self.model = None
        self._setup_gemini()
    
    def _read_api_keys(self, filename="apikey.txt"):
        """Read API keys from file."""
        try:
            if os.path.exists(filename):
                with open(filename, "r", encoding="utf-8") as file:
                    keys = [line.strip() for line in file if line.strip() and not line.startswith('#')]
                return keys
            return []
        except Exception as e:
            self.logger.error(f"Error reading API keys from {filename}: {str(e)}")
            return []
    
    def _setup_gemini(self):
        """Setup Gemini AI API."""
        try:
            # Load all available API keys
            self.api_keys = self._read_api_keys()
            
            # Add single API key if provided
            if self.api_key:
                if self.api_key not in self.api_keys:
                    self.api_keys.insert(0, self.api_key)
            
            # Add environment variable if available
            env_key = os.getenv('GEMINI_API_KEY')
            if env_key and env_key not in self.api_keys:
                self.api_keys.insert(0, env_key)
            
            if not self.api_keys:
                raise ValueError("Gemini API key not found. Please:\n"
                               "1. Set GEMINI_API_KEY environment variable, or\n"
                               "2. Provide via --api-key parameter, or\n"
                               "3. Create apikey.txt file with your API keys (one per line)")
            
            self.logger.info(f"Loaded {len(self.api_keys)} API key(s) for rotation")
            
            # Use first API key initially
            self.api_key = self.api_keys[0]
            
            # Configure Gemini
            genai.configure(api_key=self.api_key)
            
            # Setup generation config
            generation_config = {
                "temperature": 0.9,
                "top_p": 0.95,
                "top_k": 64,
                "max_output_tokens": 8192,
                "response_mime_type": "text/plain",
            }
            
            self.model = genai.GenerativeModel(
                model_name="gemini-1.5-flash", 
                generation_config=generation_config
            )
            
            self.logger.info("Gemini API initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Gemini API: {str(e)}")
            raise
    
    def rotate_api_key(self):
        """Rotate to next API key."""
        if len(self.api_keys) <= 1:
            return False
        
        self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
        self.api_key = self.api_keys[self.current_key_index]
        
        try:
            genai.configure(api_key=self.api_key)
            self.logger.info(f"Rotated to API key {self.current_key_index + 1}/{len(self.api_keys)}")
            return True
        except Exception as e:
            self.logger.error(f"Failed to configure rotated API key: {str(e)}")
            return False
    
    def get_current_key_info(self):
        """Get current API key information."""
        return {
            'current_index': self.current_key_index,
            'total_keys': len(self.api_keys),
            'key_preview': f"...{self.api_key[-6:]}" if self.api_key else "None"
        }
    
    def detect_language(self, subject):
        """Detect language of the subject."""
        try:
            lang_code = detect(subject)
            lang_name = Language.get(lang_code).display_name()
            return lang_name
        except:
            return "English"  # Default ke bahasa Inggris jika terjadi error
    
    def generate_title(self, subject, language):
        """Generate title for the article."""
        try:
            title_prompt = (
                f"Forget previous instructions. You are a professional clickbait-style blog title writer in {language}. "
                f"Come up with 1 unique, emotional, and curiosity-driven blog title for the topic: \"{subject}\". "
                f"The title must be under 60 characters, avoid clichés, and spark reader curiosity. "
                f"Use metaphor, emotion, or an unexpected twist. Do not repeat the subject word exactly."
            )
            
            response = self.model.generate_content(title_prompt)
            title = response.text.strip().replace('"', '').replace("**", "").replace("##", "")
            
            self.logger.info(f"Generated title: {title}")
            return title
            
        except Exception as e:
            self.logger.error(f"Error generating title: {str(e)}")
            return subject  # Fallback to original subject

    def generate_article(self, topic, language="id", writing_style="professional", retry_count=0):
        """
        Generate article content using Gemini AI.
        
        Args:
            topic (str): The topic for the article
            language (str): Language code (id=Indonesian, en=English)
            writing_style (str): Writing style for the article
            retry_count (int): Current retry attempt
            
        Returns:
            str: Generated article content or None if failed
        """
        max_retries = len(self.api_keys)
        
        try:
            # Detect language automatically
            detected_lang = self.detect_language(topic)
            
            # Generate title first
            title = self.generate_title(topic, detected_lang)
            
            # Get writing style description
            style_descriptions = {
                "formal": "formal dan profesional dengan bahasa baku dan struktur yang teratur",
                "informal": "santai dan ramah dengan bahasa sehari-hari yang mudah dipahami",
                "lucu": "humoris dan menghibur dengan gaya yang ringan dan penuh candaan",
                "serius": "serius dan mendalam dengan analisis yang komprehensif",
                "informatif": "informatif dan edukatif dengan fakta dan data yang akurat",
                "persuasif": "persuasif dengan argumen kuat dan call-to-action yang jelas",
                "naratif": "bercerita dengan alur yang menarik dan detail yang hidup",
                "deskriptif": "deskriptif dengan penjelasan detail dan gambaran yang jelas",
                "argumentatif": "argumentatif dengan logika yang kuat dan bukti yang mendukung",
                "opini": "opini pribadi dengan sudut pandang yang subjektif namun berdasar",
                "tutorial": "tutorial step-by-step dengan panduan yang mudah diikuti",
                "review": "review yang objektif dengan evaluasi menyeluruh",
                "listicle": "format list/poin-poin yang terstruktur dan mudah dibaca",
                "storytelling": "storytelling yang engaging dengan narasi yang memikat",
                "akademik": "akademik dan ilmiah dengan referensi yang mendalam",
                "jurnalistik": "jurnalistik dengan gaya penulisan berita yang faktual",
                "kreatif": "kreatif dan inovatif dengan pendekatan yang unik",
                "motivasi": "motivasi dan inspiratif dengan semangat yang membangkitkan",
                "analitis": "analitis dan kritis dengan pembahasan yang mendalam",
                "conversational": "percakapan yang natural seperti berbicara dengan teman"
            }

            style_descriptions_en = {
                "formal": "formal and professional with standard language and structured format",
                "informal": "casual and friendly with everyday language that's easy to understand",
                "lucu": "humorous and entertaining with light-hearted and funny approach",
                "serius": "serious and profound with comprehensive analysis",
                "informatif": "informative and educational with accurate facts and data",
                "persuasif": "persuasive with strong arguments and clear call-to-action",
                "naratif": "narrative with engaging plot and vivid details",
                "deskriptif": "descriptive with detailed explanations and clear imagery",
                "argumentatif": "argumentative with strong logic and supporting evidence",
                "opini": "opinion-based with subjective but well-founded viewpoint",
                "tutorial": "tutorial with clear step-by-step instructions",
                "review": "objective review with comprehensive evaluation",
                "listicle": "structured list format that's easy to read",
                "storytelling": "engaging storytelling with captivating narratives",
                "akademik": "academic and scholarly with deep references",
                "jurnalistik": "journalistic with factual news writing style",
                "kreatif": "creative and innovative with unique approach",
                "motivasi": "motivational and inspirational with uplifting spirit",
                "analitis": "analytical and critical with in-depth discussion",
                "conversational": "conversational and natural like talking with friends"
            }

            # Create the prompt based on language
            if language == "id":
                style_desc = style_descriptions.get(writing_style, "profesional")
                article_prompt = f"""Buatkan artikel lengkap tentang "{title}" dalam bahasa Indonesia dengan gaya penulisan {style_desc} dan struktur sebagai berikut:

1. Judul yang menarik dan SEO-friendly
2. Pendahuluan yang engaging (100-150 kata)
3. Isi artikel yang informatif dengan beberapa subheading (minimal 5 subheading)
4. Kesimpulan yang kuat dan actionable (100-150 kata)
5. Panjang total minimal 1000 kata

Pastikan artikel:
- Berkualitas tinggi dan informatif
- Menggunakan gaya penulisan {style_desc}
- Mengandung informasi yang akurat dan up-to-date
- Terstruktur dengan baik menggunakan heading dan subheading
- Menggunakan bullet points atau numbered lists jika perlu
- Menarik untuk dibaca dan memberikan value kepada pembaca
- Sesuai dengan karakteristik gaya penulisan {writing_style}

Gunakan format markdown untuk heading dan formatting."""
            else:
                style_desc = style_descriptions_en.get(writing_style, "professional")
                article_prompt = f"""Write a comprehensive article about "{title}" in English with {style_desc} writing style and following structure:

1. Engaging and SEO-friendly title
2. Compelling introduction (100-150 words)
3. Informative content with multiple subheadings (minimum 5 subheadings)
4. Strong and actionable conclusion (100-150 words)
5. Total length minimum 1000 words

Ensure the article:
- Is high-quality and informative
- Uses {style_desc} writing style
- Contains accurate and up-to-date information
- Is well-structured with proper headings and subheadings
- Uses bullet points or numbered lists when appropriate
- Is engaging to read and provides value to readers
- Matches the characteristics of {writing_style} style

Use markdown format for headings and formatting."""
            
            # Generate the article
            response = self.model.generate_content(article_prompt)
            article_content = response.text.strip()
            
            if article_content and len(article_content) > 200:
                self.logger.info(f"Successfully generated article content ({len(article_content)} characters)")
                return article_content
            else:
                self.logger.warning("Generated content is too short or empty")
                return None
                
        except Exception as e:
            self.logger.error(f"Error generating article with API key {self.current_key_index + 1}: {str(e)}")
            
            # If quota exceeded or rate limited, try rotating API key
            if ("quota" in str(e).lower() or "rate" in str(e).lower() or "limit" in str(e).lower()) and retry_count < max_retries - 1:
                self.logger.info("Quota/rate limit detected, rotating API key...")
                if self.rotate_api_key():
                    return self.generate_article(topic, language, retry_count + 1)
            
            return None
    
    def close(self):
        """Close the API connection (no cleanup needed for API)."""
        self.logger.info("Gemini API connection closed")
