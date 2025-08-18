import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { INode } from '../models/schema';
import { Constants } from './service';
import { User } from '../models/simple.schema';

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = `${Constants.ApiBase}/api-nodes/user`;

  constructor(private http: HttpClient) {}

  addUser(data: Partial<User>): Observable<INode<User>> {
    return this.http.post<INode<User>>(`${this.apiUrl}/add-user.php`, data);
  }

  updateUser(id: number, data: Partial<User>): Observable<INode<User>> {
    return this.http.post<INode<User>>(`${this.apiUrl}/update-user.php`, { id, ...data });
  }

  deleteUser(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/delete-user.php`, { id });
  }

  getUserById(id: number): Observable<INode<User>> {
    return this.http.get<INode<User>>(`${this.apiUrl}/get-user.php?id=${id}`);
  }

  getUserByUsername(username: string): Observable<INode<User>> {
    return this.http.get<INode<User>>(`${this.apiUrl}/get-user.php?username=${username}`);
  }

  listUsersByCompany(company_id: number): Observable<INode<User>[]> {
    return this.http.get<INode<User>[]>(`${this.apiUrl}/list-users-by-company.php?company_id=${company_id}`);
  }

  searchUsers(filters: any = {}, limit: number = 50, offset: number = 0): Observable<INode<User>[]> {
    const params = new URLSearchParams({ ...filters, limit: String(limit), offset: String(offset) });
    return this.http.get<INode<User>[]>(`${this.apiUrl}/search-users.php?${params}`);
  }

  seedUserFromCompany(company: any, overrides: any = {}): Observable<INode<User>> {
    return this.http.post<INode<User>>(`${this.apiUrl}/seed-user-from-company.php`, { company, overrides });
  }
}
