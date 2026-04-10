/**
 * POST multipart form data with upload progress (fetch does not expose upload progress).
 */
export function postFormDataWithProgress(
  url: string,
  formData: FormData,
  onProgress: (ratio: number) => void,
): Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        onProgress(e.loaded / e.total);
      }
    };
    xhr.onload = () => {
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        json: async () => {
          try {
            return JSON.parse(xhr.responseText || "{}") as unknown;
          } catch {
            return {};
          }
        },
      });
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
  });
}
