import axios from 'axios'

/**
 * Trích xuất thông báo lỗi người dùng từ phản hồi của API Backend (Laravel).
 * Ưu tiên:
 * 1. Nếu có errors validation và message chung chung ("The given data was invalid."), lấy lỗi cụ thể đầu tiên trong errors.
 * 2. Message cụ thể từ backend (data.message).
 * 3. Lỗi chuỗi (data.error).
 * 4. Lỗi mạng (ERR_NETWORK).
 * 5. Fallback message mặc định.
 */
export function getApiErrorMessage(
  error: unknown,
  fallbackMessage = 'Đã có lỗi xảy ra. Vui lòng thử lại.',
): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data

    if (data && typeof data === 'object') {
      const message =
        typeof data.message === 'string' && data.message.trim() ? data.message.trim() : null

      const isGenericValidationMessage =
        message !== null &&
        (message.toLowerCase().includes('the given data was invalid') ||
          message.toLowerCase() === 'validation error' ||
          message.toLowerCase() === 'dữ liệu không hợp lệ.')

      // Nếu có errors chi tiết
      if (data.errors && typeof data.errors === 'object') {
        const errorEntries = Object.entries(data.errors)
        for (const [, val] of errorEntries) {
          if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string' && val[0].trim()) {
            if (isGenericValidationMessage || !message) {
              return val[0].trim()
            }
          } else if (typeof val === 'string' && val.trim()) {
            if (isGenericValidationMessage || !message) {
              return val.trim()
            }
          }
        }
      }

      if (message) {
        return message
      }

      if (typeof data.error === 'string' && data.error.trim()) {
        return data.error.trim()
      }
    }

    if (error.code === 'ERR_NETWORK' || !error.response) {
      return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.'
    }

    if (error.response?.status === 403) {
      return 'Bạn không có quyền thực hiện thao tác này.'
    }

    if (error.response?.status === 404) {
      return 'Dữ liệu không tồn tại hoặc đã bị xóa.'
    }
  } else if (error instanceof Error && error.message) {
    return error.message
  }

  return fallbackMessage
}

/**
 * Trích xuất map lỗi validation theo từng trường: { [field]: 'Thông báo lỗi đầu tiên' }
 */
export function getApiFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error)) return {}
  const data = error.response?.data
  if (!data || typeof data !== 'object' || !data.errors || typeof data.errors !== 'object') {
    return {}
  }

  const result: Record<string, string> = {}
  Object.entries(data.errors).forEach(([field, messages]) => {
    if (Array.isArray(messages) && messages.length > 0 && typeof messages[0] === 'string') {
      result[field] = messages[0].trim()
    } else if (typeof messages === 'string' && messages.trim()) {
      result[field] = messages.trim()
    }
  })

  return result
}
