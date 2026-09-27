const TIME_ZONE = 'Asia/Ho_Chi_Minh';

export function formatDate(value?: string | null) {
  return value
    ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeZone: TIME_ZONE }).format(
        new Date(value),
      )
    : 'Chưa cập nhật';
}

export function formatDateTime(value?: string | null) {
  return value
    ? new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: TIME_ZONE,
      }).format(new Date(value))
    : 'Chưa cập nhật';
}
