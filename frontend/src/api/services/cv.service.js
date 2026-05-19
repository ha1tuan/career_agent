import { httpClient } from '../axiosInstance';

export const cvService = {
  // Field name là 'file' theo backend UploadFile = File(...)
  upload: async (file, userId) => {
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('file', file);

    // Không set Content-Type thủ công — Axios tự thêm boundary cho multipart/form-data
    const res = await httpClient.post('/api/v1/cv/upload', formData);
    return res.data; // UploadCVResponse: { success, message, cv, is_duplicate, existing_cv }
  },

  // HITL duplicate: { existing_cv_id, confirm }
  // confirm=false → dùng CV cũ | confirm=true → tạo CV + session mới
  // Response: { cv_id, reused }
  confirmDuplicate: async ({ existing_cv_id, confirm }) => {
    const res = await httpClient.post('/api/v1/cv/duplicate/confirm', {
      existing_cv_id,
      confirm,
    });
    return res.data;
  },
};
