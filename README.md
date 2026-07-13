# Blox Fruits 8 Dojo Belts (Update 24) - Auto Farm & Coordinator System

Hệ thống tự động hóa hoàn chỉnh để lấy **8 đai Dojo (Dojo Belts - Update 24)** trong tựa game Blox Fruits (Roblox), tích hợp Coordinator Web API phục vụ điều phối các tài khoản clone hỗ trợ các thử thách phức tạp (Đai 3 và Đai 5).

## 🚀 Tính năng nổi bật

1. **Hỗ trợ 8 Cấp Độ Đai**:
   - **Đai 1 (Trắng)**: Tự động dịch chuyển và tiêu diệt 20 NPC có chênh lệch tối đa 100 cấp độ.
   - **Đai 2 (Vàng)**: Tự động lái thuyền ra khơi và tiêu diệt 5 thực thể biển (Shark, Piranha).
   - **Đai 3 (Cam)**: Tự động định vị bàn giao dịch trên Turtle Island, ngồi vào bàn và thực hiện quy trình trade tự động với clone. Sử dụng API điều phối để đảm bảo đồng bộ hóa trạng thái sẵn sàng.
   - **Đai 4 (Xanh Lá)**: Tự động mua thuyền, lái ra vùng biển Danger Zone 4-6 và duy trì sống sót trong 4 phút kết hợp cơ chế Anti-AFK.
   - **Đai 5 (Xanh Dương)**: Thực hiện chuỗi hành động của quest Saikeirei bằng cách mua ngẫu nhiên trái ác quỷ, ném ra đất và nhặt lại, điều phối với clone thông qua API.
   - **Đai 6 (Tím)**: Săn lùng 3 Elite Pirate (Deandre, Diablo, Urban) kết hợp tự động chuyển server (Server Hop) nếu không có boss trong máy chủ hiện tại.
   - **Đai 7 (Đỏ)**: Di chuyển ra Danger Zone 6 bằng thuyền và săn tiêu diệt Terrorshark.
   - **Đai 8 (Đen)**: Tự động tìm kiếm và nhặt 3 Khúc Xương Khủng Long (DinoBone) trên đảo Prehistoric.

2. **Web API Coordinator (Node.js & Express)**:
   - Cung cấp các API endpoint để đồng bộ hóa trạng thái giữa tài khoản chính và các tài khoản clone hỗ trợ trade/ném trái ác quỷ.
   - Sở hữu giao diện Web Dashboard cực kỳ hiện đại, hiển thị trạng thái realtime của clone và nhật ký hoạt động chi tiết (logs).

3. **Giao diện minimal premium trên Roblox (Lua)**:
   - Giao diện tối giản mang đậm phong cách Draco Minimal UI.
   - Hiển thị trực quan tiến trình và trạng thái hoạt động của từng đai.
   - Các ô chỉ báo đai tự động sáng màu xanh lá khi đai tương ứng đã có trong túi đồ.
   - Nhấn nút **Left Alt** để bật/ẩn giao diện nhanh chóng.

---

## 🛠️ Hướng dẫn cài đặt & Chạy hệ thống

### Bước 1: Khởi động Web API Coordinator
1. Cài đặt các gói phụ thuộc (Dependencies):
   ```bash
   npm install
   ```
2. Khởi chạy server:
   ```bash
   npm start
   ```
   *Mặc định Coordinator server sẽ chạy trên cổng `http://localhost:3000`.*
3. Mở trình duyệt web truy cập `http://localhost:3000` để theo dõi Dashboard điều phối.

### Bước 2: Chạy Lua Script trên Roblox
1. Sao chép toàn bộ nội dung file [auto_belts.lua](./auto_belts.lua).
2. Dán và chạy (Execute) trên công cụ hack/executor Roblox của bạn (ví dụ: Synapse, Fluxus, Delta, Wave,...).
3. Giao diện UI sẽ xuất hiện ở phía bên phải màn hình. Nhấp **START AUTO 8 BELTS** để bắt đầu chuỗi nhiệm vụ.

---

## 📂 Cấu trúc dự án

- `server.js`: Web API phục vụ điều phối trạng thái clone & Dashboard giao diện.
- `package.json`: Cấu hình các package Node.js.
- `auto_belts.lua`: Mã nguồn Lua chạy trên Roblox Client.

---

## ⚠️ Lưu ý quan trọng
- Đảm bảo thiết lập đúng địa chỉ API trong biến `API_URL` ở đầu file `auto_belts.lua` nếu bạn host Coordinator server ở một IP/port khác.
- Đối với Đai 3 và Đai 5, hãy bật nút gạt **READY** trên Dashboard hoặc sử dụng API POST tương ứng để thông báo cho tài khoản chính biết clone đã vào vị trí sẵn sàng.
