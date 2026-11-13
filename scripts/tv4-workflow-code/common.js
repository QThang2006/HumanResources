const emailValid = value => /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(String(value || '').trim());
const chatValid = value => /^-?[1-9]\d*$/.test(String(value || '').trim());
const escapeHtml = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const httpUrl = value => { const text = String(value || '').trim(); const match = text.match(/^https?:\/\/([^\s/<>"'?#]+)(?:[/?#][^\s<>"']*)?$/i); return match && !match[1].includes('@') ? text : ''; };
const outputError = (name, recipient, telegram = false) => {
  try {
    const result = $(name).item.json;
    if (!result || result.error) return String(result?.error?.message || result?.error || 'Không có kết quả gửi.');
    if (telegram) return result.ok === true || Number.isInteger(result.message_id) ? '' : 'Telegram chưa xác nhận gửi thành công.';
    if (Array.isArray(result.rejected) && result.rejected.length) return 'Máy chủ email từ chối người nhận.';
    if (Array.isArray(result.accepted)) return result.accepted.some(email => String(email).toLowerCase() === String(recipient).toLowerCase()) ? '' : 'Máy chủ email chưa chấp nhận người nhận.';
    return result.messageId ? '' : 'Máy chủ email chưa xác nhận gửi thành công.';
  } catch { return 'Kênh chưa chạy hoặc không trả kết quả.'; }
};
const deliveryStatus = flags => flags.every(Boolean) ? 'SENT' : flags.some(Boolean) ? 'PARTIAL' : 'FAILED';
