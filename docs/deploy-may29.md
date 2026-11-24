# Hướng dẫn triển khai & tự động cập nhật DocManS trên Máy 29

Tài liệu này mô tả cách chạy DocManS trên **Máy 29 (Linux/Ubuntu + Docker)**, công khai qua tên miền **https://khqs.thanhdotien.com** bằng **Cloudflare Tunnel**, và tự động cập nhật theo nhánh `DocManS` trên GitHub (`thanhdotien278/DocManS`).

## 1. Kiến trúc triển khai

- **GitHub (`origin/DocManS`)**: nguồn code chính. Mọi thay đổi đẩy lên nhánh `DocManS` sẽ tự động được kéo về Máy 29.
- **Máy 29 (`docker-compose.prod.yml`)**: chạy 6 container (`postgres`, `minio`, `api`, `web`, `nginx`, `cloudflared`). Không cần mở port ra ngoài Internet.
- **Cloudflare Tunnel (`khqs-docmans`)**: định tuyến `https://khqs.thanhdotien.com` trực tiếp vào `http://nginx:80` trong mạng nội bộ Docker.

## 2. Cài đặt lần đầu trên Máy 29

### Bước 1: Clone repository

```bash
git clone -b DocManS https://github.com/thanhdotien278/DocManS.git /opt/docmans
cd /opt/docmans
```

*(Nếu repo đang là private trên GitHub, cấu hình SSH key hoặc GitHub Personal Access Token trước khi clone.)*

### Bước 2: Tạo file `.env.prod`

```bash
cp .env.prod.example .env.prod
nano .env.prod
```

Cập nhật các giá trị bí mật bắt buộc:
- `POSTGRES_PASSWORD`: mật khẩu mạnh cho PostgreSQL.
- `MINIO_SECRET_KEY`: mật khẩu mạnh cho MinIO (tối thiểu 8 ký tự).
- `CLOUDFLARE_TUNNEL_TOKEN`: token của tunnel `khqs-docmans` trên Cloudflare.
- `SEED_ADMIN_PASSWORD`: mật khẩu khởi tạo cho tài khoản `admin` (tối thiểu 12 ký tự, chỉ dùng khi chạy seed lần đầu).

### Bước 3: Build và khởi chạy lần đầu

```bash
chmod +x scripts/deploy-may29.sh
./scripts/deploy-may29.sh --force
```

Kiểm tra các container đang chạy:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
```

### Bước 4: Khởi tạo dữ liệu ban đầu (chỉ chạy 1 lần khi DB còn trống)

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec api npm run prisma:seed
```

Sau khi hoàn tất, truy cập `https://khqs.thanhdotien.com` để kiểm tra.

## 3. Bật tự động cập nhật theo GitHub (mỗi 2 phút)

Mở crontab trên Máy 29:

```bash
crontab -e
```

Thêm dòng sau (thay `/opt/docmans` nếu bạn đặt thư mục khác):

```cron
*/2 * * * * /opt/docmans/scripts/deploy-may29.sh >> /var/log/docmans-deploy.log 2>&1
```

Cơ chế hoạt động:
- Mỗi 2 phút, script chạy `git fetch origin DocManS`.
- Nếu không có commit mới, script thoát ngay (không tốn tài nguyên).
- Nếu có commit mới, script kéo code mới, build image mới song song trong khi bản cũ vẫn đang chạy, sau đó khởi động lại container (`api` tự động chạy `npm run prisma:deploy` để cập nhật migration mà không làm mất dữ liệu).
- Dùng `flock` để tránh 2 tiến trình deploy chạy chồng lên nhau.

## 4. Quy trình hằng ngày từ máy phát triển

Khi hoàn thành thay đổi trên máy cá nhân:

```bash
git checkout DocManS
git merge <nhanh-tinh-nang>   # hoặc commit trực tiếp
git push origin DocManS
```

Trong vòng tối đa 2 phút, Máy 29 sẽ tự cập nhật và phản ánh thay đổi trên `https://khqs.thanhdotien.com`.

## 5. Lệnh vận hành & kiểm tra sự cố

```bash
# Xem log deploy tự động
tail -f /var/log/docmans-deploy.log

# Xem log từng dịch vụ
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f api web nginx cloudflared

# Kiểm tra phản hồi cục bộ qua nginx
curl -I http://127.0.0.1:8080

# Kiểm tra sức khoẻ API (liveness & readiness Postgres + MinIO)
curl -s http://127.0.0.1:8080/api/v1/health
curl -s http://127.0.0.1:8080/api/v1/health/ready

# Ép build và khởi động lại ngay
./scripts/deploy-may29.sh --force
```

## 6. Cấu hình Bảo mật & Vận hành nâng cao

### Biến bảo mật trong `.env.prod`
- `CSRF_SECRET`: chuỗi bí mật tối thiểu 32 ký tự (`openssl rand -base64 32`) để ký mã CSRF theo phiên.
- `CSP_MODE`: mặc định `report-only` để ghi nhận vi phạm (`csp_violation` trong log `api`) trước khi chuyển sang `enforce`.
- `LOGIN_OTP_MODE`: mặc định `off` trên Máy 29. Chỉ đổi sang `required-roles` sau khi cấu hình `SMTP_*` hoạt động ổn định và đã nhập đủ `Thư công vụ` (`credentialEmail`) cho các tài khoản lãnh đạo, Phòng KHQS và quản trị.
- `MINIO_APP_ACCESS_KEY` / `MINIO_APP_SECRET_KEY`: tuỳ chọn tách tài khoản ứng dụng MinIO có quyền giới hạn trong đúng bucket hệ thống (thông qua `scripts/minio-init.sh`).

### Sao lưu và khôi phục dữ liệu
- Chạy thủ công hoặc gắn cron hằng ngày lúc 01:30 để sao lưu PostgreSQL (`pg_dump -Fc`) và volume MinIO kèm `SHA256SUMS`:

```cron
30 1 * * * cd /opt/docmans && ./scripts/backup.sh >> /var/log/docmans-backup.log 2>&1
```

- Diễn tập hoặc khôi phục từ một thư mục sao lưu:

```bash
./scripts/restore.sh backups/<YYYYMMDD_HHMMSS>
```

### Chứng chỉ TLS khi triển khai on-premise (tuỳ chọn dự phòng)
- Trên Máy 29, TLS do Cloudflare Tunnel quản lý nên không cần chạy certbot. Nếu triển khai trực tiếp trên mạng nội bộ/Internet không qua Cloudflare Tunnel, có thể dùng `scripts/letsencrypt-init.sh` (kết hợp profile `letsencrypt`) và `scripts/check-cert-expiry.sh` để cấp và giám sát hạn chứng chỉ TLS.
