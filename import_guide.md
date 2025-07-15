
# 📖 Panduan Import Posts

## Format JSON yang Didukung

Gunakan template `post_template.json` sebagai referensi untuk membuat file import Anda.

## Field yang Diperlukan (Required)

- **id**: Identifier unik untuk post (URL-friendly, contoh: "tutorial-react-hooks")
- **title**: Judul post
- **author**: Nama penulis
- **date**: Tanggal dalam format "YYYY-MM-DD"
- **excerpt**: Ringkasan singkat post (untuk preview)
- **content**: Konten lengkap post (mendukung HTML)

## Field Opsional

- **category**: Kategori post (default: "Umum")
- **tags**: Array berisi tags/label (contoh: ["tutorial", "web"])
- **generated_by**: Sumber pembuat ("manual", "AI", dll)
- **keyword**: Kata kunci utama untuk SEO
- **language**: Bahasa konten ("id" atau "en")

## Tips Import

1. **File Format**: Gunakan file `.json` dengan encoding UTF-8
2. **ID Post**: Harus unik, URL-friendly (huruf kecil, tanpa spasi)
3. **HTML Content**: Gunakan `<br>` untuk line break, `<strong>` untuk bold
4. **Images**: Gunakan URL gambar online atau base64 encoding
5. **Validation**: Pastikan JSON format valid sebelum import

## Contoh Penggunaan

```json
[
  {
    "id": "my-first-post",
    "title": "Post Pertama Saya", 
    "author": "Admin",
    "date": "2024-01-15",
    "excerpt": "Ini adalah post pertama di blog saya.",
    "content": "Selamat datang di blog saya!<br><br>Ini adalah konten lengkap post pertama."
  }
]
```

## Troubleshooting

- **Error "ID sudah ada"**: Ganti ID dengan yang unik
- **JSON Invalid**: Cek syntax dengan JSON validator online
- **Gambar tidak muncul**: Pastikan URL gambar dapat diakses publik
- **Format tanggal salah**: Gunakan format YYYY-MM-DD (contoh: 2024-01-15)
