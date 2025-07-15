
"""
Scheduled bulk article generator.
Automatically generates articles from keywords and deploys them.
"""

import os
import json
import time
import logging
from datetime import datetime
from typing import List, Dict, Any

# Import modules from existing codebase
from gemini import GeminiScraper
from utils import generate_post_id, extract_excerpt_from_content
from templates import get_modern_template, get_magazine_template, get_corporate_template, get_business_template, get_tech_template, get_minimal_template
import requests

class ScheduledArticleGenerator:
    def __init__(self, config_file="scheduler_config.json"):
        self.config_file = config_file
        self.logger = self._setup_logging()
        self.config = self._load_config()
        
    def _setup_logging(self):
        """Setup logging for scheduler."""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.StreamHandler(),
                logging.FileHandler('scheduler.log')
            ]
        )
        return logging.getLogger(__name__)
    
    def _load_config(self) -> Dict[str, Any]:
        """Load scheduler configuration."""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                self.logger.info("Configuration loaded successfully")
                return config
            else:
                self.logger.warning(f"Config file {self.config_file} not found")
                return {}
        except Exception as e:
            self.logger.error(f"Error loading config: {str(e)}")
            return {}
    
    def _save_posts_to_file(self, posts: List[Dict], filename="posts.json"):
        """Save posts to JSON file."""
        try:
            # Load existing posts if file exists
            existing_posts = []
            if os.path.exists(filename):
                with open(filename, 'r', encoding='utf-8') as f:
                    existing_posts = json.load(f)
            
            # Add new posts
            existing_posts.extend(posts)
            
            # Save all posts
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(existing_posts, f, indent=2, ensure_ascii=False)
            
            self.logger.info(f"Saved {len(posts)} new posts to {filename}")
            return True
        except Exception as e:
            self.logger.error(f"Error saving posts: {str(e)}")
            return False
    
    def _deploy_articles_to_cloudflare(self, posts: List[Dict]) -> bool:
        """Deploy articles to Cloudflare Worker."""
        try:
            # Get Cloudflare config from environment or config file
            cf_account_id = self.config.get('cf_account_id') or os.getenv('CF_ACCOUNT_ID')
            cf_api_token = self.config.get('cf_api_token') or os.getenv('CF_API_TOKEN')
            worker_name = self.config.get('worker_name') or os.getenv('WORKER_NAME')
            
            if not all([cf_account_id, cf_api_token, worker_name]):
                self.logger.error("Missing Cloudflare configuration")
                return False
            
            # Get current worker script
            headers = {
                "Authorization": f"Bearer {cf_api_token}",
                "Content-Type": "application/json"
            }
            
            url = f"https://api.cloudflare.com/client/v4/accounts/{cf_account_id}/workers/scripts/{worker_name}"
            response = requests.get(url, headers=headers)
            
            if response.status_code != 200:
                self.logger.error(f"Failed to get current worker script: {response.status_code}")
                return False
            
            current_script = response.text
            
            # Load all posts from file
            all_posts = []
            if os.path.exists("posts.json"):
                with open("posts.json", 'r', encoding='utf-8') as f:
                    all_posts = json.load(f)
            
            # Update script with new posts data
            posts_json = json.dumps(all_posts, indent=2)
            
            # Replace posts data in script
            import re
            if '{{POSTS_DATA}}' in current_script:
                updated_script = current_script.replace('{{POSTS_DATA}}', posts_json)
            else:
                # Find and replace existing posts data
                updated_script = re.sub(
                    r'const posts = \[.*?\];', 
                    f'const posts = {posts_json};', 
                    current_script, 
                    flags=re.DOTALL
                )
            
            # Deploy updated script
            deploy_headers = {
                "Authorization": f"Bearer {cf_api_token}",
                "Content-Type": "application/javascript"
            }
            
            deploy_response = requests.put(url, headers=deploy_headers, data=updated_script)
            
            if deploy_response.status_code == 200:
                self.logger.info("Successfully deployed articles to Cloudflare Worker")
                return True
            else:
                self.logger.error(f"Failed to deploy: {deploy_response.status_code}")
                return False
                
        except Exception as e:
            self.logger.error(f"Error deploying to Cloudflare: {str(e)}")
            return False
    
    def generate_articles_from_keywords(self, keywords: List[str], language="id", 
                                      category="Teknologi", writing_style="informatif") -> List[Dict]:
        """Generate articles from list of keywords."""
        generated_posts = []
        
        try:
            gemini = GeminiScraper()
            
            for i, keyword in enumerate(keywords):
                self.logger.info(f"Generating article {i+1}/{len(keywords)}: {keyword}")
                
                try:
                    # Generate article content
                    article_content = gemini.generate_article(keyword, language, writing_style)
                    
                    if article_content:
                        # Process content
                        lines = article_content.split('\n')
                        title = keyword  # Default title
                        content_start = 0
                        
                        # Extract title from content
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
                        excerpt = extract_excerpt_from_content(content)
                        
                        # Generate auto tags
                        auto_tags = self._generate_auto_tags(keyword, title, category)
                        
                        new_post = {
                            "id": post_id,
                            "title": title,
                            "author": "AI Scheduler",
                            "date": datetime.now().strftime("%Y-%m-%d"),
                            "excerpt": excerpt,
                            "content": content,
                            "category": category,
                            "tags": auto_tags,
                            "generated_by": "AI_Scheduled",
                            "keyword": keyword,
                            "language": language,
                            "scheduled_at": datetime.now().isoformat()
                        }
                        
                        generated_posts.append(new_post)
                        self.logger.info(f"Successfully generated: {title}")
                        
                    else:
                        self.logger.error(f"Failed to generate content for: {keyword}")
                
                except Exception as e:
                    self.logger.error(f"Error generating article for '{keyword}': {str(e)}")
                
                # Add delay between requests
                time.sleep(2)
            
            gemini.close()
            
        except Exception as e:
            self.logger.error(f"Error in bulk generation: {str(e)}")
        
        return generated_posts
    
    def _generate_auto_tags(self, keyword: str, title: str, category: str) -> List[str]:
        """Generate automatic tags from keyword, title, and category."""
        tags = []
        
        # Add category as a tag
        tags.append(category.lower())
        
        # Extract words from keyword
        keyword_words = keyword.lower().split()
        for word in keyword_words:
            if len(word) > 3:
                tags.append(word)
        
        # Extract meaningful words from title
        title_words = title.lower().split()
        for word in title_words:
            if len(word) > 4 and word not in tags:
                tags.append(word)
        
        # Limit to 5 tags and remove duplicates
        tags = list(dict.fromkeys(tags))[:5]
        return tags
    
    def run_scheduled_generation(self):
        """Main function to run scheduled article generation."""
        self.logger.info("Starting scheduled article generation...")
        
        try:
            # Get keywords from config
            keywords = self.config.get('keywords', [])
            if not keywords:
                self.logger.warning("No keywords found in configuration")
                return
            
            # Get generation settings
            language = self.config.get('language', 'id')
            category = self.config.get('category', 'Teknologi')
            writing_style = self.config.get('writing_style', 'informatif')
            auto_deploy = self.config.get('auto_deploy', True)
            
            self.logger.info(f"Processing {len(keywords)} keywords...")
            
            # Generate articles
            generated_posts = self.generate_articles_from_keywords(
                keywords, language, category, writing_style
            )
            
            if generated_posts:
                self.logger.info(f"Successfully generated {len(generated_posts)} articles")
                
                # Save posts to file
                if self._save_posts_to_file(generated_posts):
                    self.logger.info("Posts saved successfully")
                    
                    # Auto deploy if enabled
                    if auto_deploy:
                        self.logger.info("Starting auto-deploy...")
                        if self._deploy_articles_to_cloudflare(generated_posts):
                            self.logger.info("Auto-deploy completed successfully")
                        else:
                            self.logger.error("Auto-deploy failed")
                else:
                    self.logger.error("Failed to save posts")
            else:
                self.logger.warning("No articles were generated")
                
        except Exception as e:
            self.logger.error(f"Error in scheduled generation: {str(e)}")
        
        self.logger.info("Scheduled article generation completed")

def main():
    """Main entry point for scheduled execution."""
    generator = ScheduledArticleGenerator()
    generator.run_scheduled_generation()

if __name__ == "__main__":
    main()
