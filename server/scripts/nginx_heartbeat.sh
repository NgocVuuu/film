#!/bin/bash
# ==============================================================================
# pChill Nginx Heartbeat Script - The "Air Traffic Controller"
# Dùng để gửi nhịp tim (Load, RAM, Network) về API Node.js Server
# Chạy Script này ngầm (bằng systemd hoặc cron) trên mỗi Nginx Node.
# ==============================================================================

# ================= CẤU HÌNH =================================
NODE_ID="TU_DAT_TEN_NODE_VI_DU_stream1_pchill_com" # Ví dụ: nginx_node_1
BACKEND_API="https://api.pchill.online/api/admin/nodes/heartbeat"
API_SECRET="YOUR_ADMIN_SECRET_OR_JWT_TOKEN" # Mật khẩu báo danh với API Backend
INTERVAL=10 # Báo cáo sự sống mỗi 10 giây
# ============================================================

echo "Khởi động Nginx Heartbeat cho Node: $NODE_ID"

while true; do
  # Lấy % CPU Đang Dùng (dùng lệnh top hoặc mpstat, lấy dòng cơ bản)
  CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
  
  # Lấy RAM đang dùng
  RAM_OUTPUT=$(free -m | awk 'NR==2{printf "%s/%sMB (%.2f%%)", $3,$2,$3*100/$2}')
  
  # Lấy Số lượng Kết nối Nginx Đang Mở (Active Connections)
  if curl -s http://127.0.0.1/nginx_status > /dev/null; then
      NGINX_CONN=$(curl -s http://127.0.0.1/nginx_status | grep "Active connections" | awk '{print $3}')
  else
      # Nếu chưa bật Nginx Status, đếm port 80/443 bằng netstat
      NGINX_CONN=$(netstat -an | grep :80 | grep ESTABLISHED | wc -l)
  fi

  # Lấy Tốc độ mạng (Interface eth0 hoặc cấu hình thay đổi) - Cần cài vnstat hoặc đo lệnh thủ công, bỏ qua để nhanh
  # Giả sử Network đang chiếm bao nhiêu connection là gánh nặng chính.

  # Gửi JSON Report về Node.js (Least Connection Balancer)
  PAYLOAD="{\"nodeId\": \"$NODE_ID\", \"cpu\": \"$CPU_USAGE\", \"ram\": \"$RAM_OUTPUT\", \"activeConnections\": \"$NGINX_CONN\"}"
  
  # Gửi POST ngầm (-s -o /dev/null)
  curl -s -X POST -H "Content-Type: application/json" \
       -H "Authorization: Bearer $API_SECRET" \
       -d "$PAYLOAD" \
       $BACKEND_API > /dev/null

  # Chờ 10 giây báo tiếp
  sleep $INTERVAL
done
