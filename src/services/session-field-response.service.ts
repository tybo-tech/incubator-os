import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from './service';
import { ISessionFieldResponse, SaveResponsesRequest } from '../models/form-system.models';

@Injectable({ providedIn: 'root' })
export class SessionFieldResponseService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/session-field-response`;

  constructor(private http: HttpClient) {}

  addResponse(data: Partial<ISessionFieldResponse>): Observable<ISessionFieldResponse> {
    return this.http.post<ISessionFieldResponse>(`${this.apiUrl}/add-response.php`, data);
  }

  updateResponse(id: number, data: Partial<ISessionFieldResponse>): Observable<ISessionFieldResponse> {
    const params = new URLSearchParams({ id: String(id) });
    return this.http.post<ISessionFieldResponse>(`${this.apiUrl}/update-response.php?${params}`, data);
  }

  getResponseById(id: number): Observable<ISessionFieldResponse> {
    return this.http.get<ISessionFieldResponse>(`${this.apiUrl}/get-response.php?id=${id}`);
  }

  getResponsesBySession(
    sessionId: number,
    withFields: boolean = false
  ): Observable<ISessionFieldResponse[]> {
    const params = new URLSearchParams({
      session_id: String(sessionId),
      with_fields: withFields ? 'true' : 'false'
    });
    return this.http.get<ISessionFieldResponse[]>(`${this.apiUrl}/list-responses.php?${params}`);
  }

  getResponsesByField(
    fieldNodeId: number,
    sessionIds?: number[]
  ): Observable<ISessionFieldResponse[]> {
    const params = new URLSearchParams({ field_node_id: String(fieldNodeId) });
    if (sessionIds && sessionIds.length > 0) {
      params.append('session_ids', sessionIds.join(','));
    }
    return this.http.get<ISessionFieldResponse[]>(`${this.apiUrl}/get-field-responses.php?${params}`);
  }

  deleteResponse(id: number): Observable<{ success: boolean }> {
    return this.http.get<{ success: boolean }>(`${this.apiUrl}/delete-response.php?id=${id}`);
  }

  upsertResponse(
    sessionId: number,
    fieldNodeId: number,
    data: Partial<ISessionFieldResponse>
  ): Observable<ISessionFieldResponse> {
    const params = new URLSearchParams({
      session_id: String(sessionId),
      field_node_id: String(fieldNodeId)
    });
    return this.http.post<ISessionFieldResponse>(`${this.apiUrl}/upsert-response.php?${params}`, data);
  }

  saveResponses(
    sessionId: number,
    data: SaveResponsesRequest
  ): Observable<ISessionFieldResponse[]> {
    const params = new URLSearchParams({ session_id: String(sessionId) });
    return this.http.post<ISessionFieldResponse[]>(`${this.apiUrl}/save-responses.php?${params}`, data);
  }

  // Helper method to save a single field response
  saveFieldResponse(
    sessionId: number,
    fieldNodeId: number,
    value: any,
    fieldType: string = 'text'
  ): Observable<ISessionFieldResponse> {
    const responseData: Partial<ISessionFieldResponse> = {};

    // Map value to appropriate field based on type
    switch (fieldType) {
      case 'number':
      case 'currency':
      case 'percentage':
      case 'rating':
      case 'scale':
        responseData.value_num = Number(value);
        break;
      case 'date':
        responseData.value_date = value;
        break;
      case 'yesno':
      case 'checkbox':
        responseData.value_bool = Boolean(value);
        break;
      case 'dropdown':
      case 'radio':
        if (Array.isArray(value)) {
          responseData.value_json = value;
        } else {
          responseData.value_text = String(value);
        }
        break;
      case 'file':
        responseData.file_url = String(value);
        break;
      default:
        if (typeof value === 'object') {
          responseData.value_json = value;
        } else {
          responseData.value_text = String(value);
        }
    }

    return this.upsertResponse(sessionId, fieldNodeId, responseData);
  }
}
