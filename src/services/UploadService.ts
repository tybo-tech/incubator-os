import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ToastService } from '../app/services/toast.service';
import { Constants } from './service';


// Interface matching the PHP upload.php response format
interface UploadResponse {
  success: boolean;
  url: string; // Relative path like "images/2025/09/filename.webp"
  stored_name: string; // The actual filename stored on server
  original_name: string; // The original filename uploaded by user
  mime: string; // MIME type (e.g., "image/webp")
  size: number; // File size in bytes
}

@Injectable({
  providedIn: 'root',
})
export class UploadService {
  url: string;
  uploadBaseUrl: string;

  /** Base URL for the local API upload endpoint (PPTX / PDF / any document). */
  private readonly localUploadBase = `${Constants.ApiBase}api-nodes/upload`;

  constructor(private http: HttpClient, private toast: ToastService) {
    this.url = `https://uploads.rbttacesd.co.za`;
    this.uploadBaseUrl = `https://uploads.rbttacesd.co.za/upload`;
  }

  /**
   * Upload any document (PDF, PPTX, etc.) through the local API server.
   * Calls back with the full public URL of the stored file.
   */
  uploadDocument(file: File, cb: (url: string) => void): void {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name);

    this.http.post<UploadResponse>(`${this.localUploadBase}/upload.php`, formData).subscribe({
      next: (res) => {
        if (res?.success) {
          cb(`${this.localUploadBase}/${res.url}`);
        } else {
          console.error('Document upload failed:', res);
          this.toast.error('Upload failed. Please try again.');
        }
      },
      error: (err) => {
        console.error('Document upload error:', err);
        this.toast.error('Upload failed. Please check your connection.');
      },
    });
  }

  uploadFile(formData: FormData): Observable<UploadResponse> {
    return this.http.post<UploadResponse>(
      `${this.url}/upload/upload.php`,
      formData
    );
  }

  deleteFile(fileName: string): Observable<any> {
    return this.http.get<any>(`${this.url}/upload/delete.php?file=${fileName}`);
  }

  public onUpload = (
    files: FileList | null,
    item: any,
    key: string,
    cb: (url: string) => void
  ) => {
    if (!files || files.length === 0) {
      return;
    }
    Array.from(files).forEach((file: any) => {
      if (file.size < 2000000) this.uploadOriginal(file, item, key, cb);
      else this.resizeImage(file, item, key, cb);
    });
  };

  uploadOriginal(file: any, item: any, key: string, cb: (url: string) => void) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append(
      'name',
      `tybo.${file.name.split('.')[file.name.split('.').length - 1]}`
    ); // file extention

    console.log('Uploading file:', file.name, 'Size:', file.size);

    this.uploadFile(formData).subscribe({
      next: (response) => {
        console.log('Upload response:', response);

        if (response && response.success && item) {
          // API returns relative path like "images/2025/09/filename.webp"
          // Append to upload base URL: https://ithebula.tybo.co.za/api/api/upload/images/2025/09/filename.webp
          const uri = `${this.uploadBaseUrl}/${response.url}`;

          console.log('Final image URI:', uri);

          item[key] = uri;
          cb(uri);
        } else {
          console.error('Upload failed:', response);
          this.toast.error('Upload failed. Please try again.');
        }
      },
      error: (error) => {
        console.error('Upload error:', error);
        this.toast.error('Upload failed. Please check your connection and try again.');
      },
    });
  }

  resizeImage(file: any, item: any, key: string, cb: (url: string) => void) {
    console.log(
      'Resizing image:',
      file.name,
      'Size:',
      file.size,
      'Type:',
      file.type
    );

    if (file.type.match(/image.*/) && file.type !== 'image/gif') {
      const reader = new FileReader();
      reader.onload = (readerEvent: any) => {
        const image = new Image();
        image.onload = (imageEvent) => {
          // Resize the image
          const canvas = document.createElement('canvas');
          const maxSize = 800;
          let width = image.width;
          let height = image.height;
          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d')?.drawImage(image, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg');
          const resizedImage = this.dataURLToBlob(dataUrl);
          let extention = 'iio.jpg';
          if (file.type === 'image/gif') {
            extention = 'iio.gif';
          }
          let fileOfBlob = new File([resizedImage], extention);
          // upload
          let formData = new FormData();
          formData.append('file', fileOfBlob);
          formData.append('name', 'iio');

          this.uploadFile(formData).subscribe({
            next: (response) => {
              console.log('Resize upload response:', response);

              if (response && response.success) {
                // API returns relative path like "images/2025/09/filename.webp"
                // Append to upload base URL: https://ithebula.tybo.co.za/api/api/upload/images/2025/09/filename.webp
                const uri = `${this.uploadBaseUrl}/${response.url}`;

                console.log('Final resized image URI:', uri);

                item[key] = uri;
                cb(uri);
              } else {
                console.error('Resize upload failed:', response);
                this.toast.error('Upload failed. Please try again.');
              }
            },
            error: (error) => {
              console.error('Resize upload error:', error);
              this.toast.error('Upload failed. Please check your connection and try again.');
            },
          });
        };
        image.src = readerEvent.target.result.toString();
      };
      reader.readAsDataURL(file);
    }
  }
  dataURLToBlob(dataURL: any) {
    const BASE64_MARKER = ';base64,';
    if (dataURL.indexOf(BASE64_MARKER) === -1) {
      // tslint:disable-next-line: no-shadowed-variable
      const parts = dataURL.split(',');
      // tslint:disable-next-line: no-shadowed-variable
      const contentType = parts[0].split(':')[1];
      // tslint:disable-next-line: no-shadowed-variable
      const raw = parts[1];

      return new Blob([raw], { type: contentType });
    }

    const parts = dataURL.split(BASE64_MARKER);
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;

    const uInt8Array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], { type: contentType });
  }
}
