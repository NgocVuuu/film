'use client';

import { useEffect } from 'react';
import disableDevtool from 'disable-devtool';

export default function DisableDevTools() {
  useEffect(() => {
    // Kích hoạt thư viện disable-devtool
    // Thư viện này hỗ trợ chặn rất mạnh: F12, chuột phải, debugger, inspect, thay đổi kích thước window (khi mở devtools doc), v.v.
    disableDevtool({
      md5: '', // tuỳ chọn md5 để bypass
      url: '', // url redirect nếu phát hiện mở devtools (để trống là ko redirect)
      timeOutUrl: '', // url redirect nếu bị timeout do debugger
      disableMenu: true, // chặn menu chuột phải
      disableSelect: false, // cho phép bôi đen text bình thường
      disableCopy: false, // cho phép copy bình thường
      disableCut: false,
      disablePaste: false,
      clearLog: true, // tự động xoá console.log
    });
  }, []);

  return null;
}
