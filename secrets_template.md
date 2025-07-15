
# Secrets Configuration for Scheduled Deployment

Untuk menggunakan fitur scheduled auto-generate artikel, Anda perlu menambahkan secrets berikut di Replit:

## Required Secrets

1. **CF_ACCOUNT_ID**
   - Value: Account ID Cloudflare Anda
   - Description: ID akun Cloudflare untuk deploy worker

2. **CF_API_TOKEN** 
   - Value: API Token Cloudflare dengan permission Workers:Edit
   - Description: Token untuk mengakses Cloudflare API

3. **WORKER_NAME**
   - Value: Nama worker Cloudflare yang akan di-update
   - Description: Target worker untuk deploy artikel

4. **GEMINI_API_KEY** (Opsional)
   - Value: API Key Google Gemini
   - Description: Jika tidak menggunakan apikey.txt

## Cara Menambahkan Secrets

1. Buka tab "Secrets" di Replit workspace
2. Klik "+ New Secret"
3. Masukkan nama dan value untuk setiap secret
4. Klik "Add Secret"

## Cara Deploy Scheduler

1. Lengkapi konfigurasi di halaman "⏰ Auto Generator"
2. Klik tombol "Deploy" di header Replit
3. Pilih "Scheduled Deployments"
4. Set schedule sesuai konfigurasi (contoh: `0 9 * * *` untuk jam 9 pagi setiap hari)
5. Set command: `python scheduler.py`
6. Pastikan semua secrets sudah ditambahkan
7. Klik "Deploy"

## Schedule Examples

- `0 9 * * *` - Setiap hari jam 9 pagi
- `0 18 * * 1` - Setiap Senin jam 6 sore  
- `30 14 1 * *` - Tanggal 1 setiap bulan jam 2:30 siang
- `0 */6 * * *` - Setiap 6 jam sekali

Scheduler akan otomatis generate artikel dari keywords yang dikonfigurasi dan deploy ke Cloudflare Worker sesuai jadwal.
