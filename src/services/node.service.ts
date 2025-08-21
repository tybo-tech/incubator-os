// src/services/node.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { INode } from '../models/schema';
import { Constants } from './service';
import { FinancialCheckIn } from '../models/busines.financial.checkin.models';
import { Company } from '../models/business.models';

@Injectable({
  providedIn: 'root',
})
export class NodeService<T = any> {
  private apiUrl = `${Constants.ApiBase}/api-nodes/node`;

  constructor(private http: HttpClient) {}

  // Get all nodes
  getAllNodes(): Observable<INode<T>[]> {
    const url = `${this.apiUrl}/get-all-nodes.php`;
    return this.http.get<INode<T>[]>(url);
  }

  // Get a specific node by ID with hydrated relationships
  getNodeById(nodeId: number): Observable<INode<T>> {
    const url = `${this.apiUrl}/get-node.php?nodeId=${nodeId}`;
    return this.http.get<INode<T>>(url);
  }

  // Get nodes with optional filters and hydrated relationships
  getNodes(type?: string, parentId?: number): Observable<INode<T>[]> {
    let url = `${this.apiUrl}/get-nodes.php`;
    const params: string[] = [];

    if (type) {
      params.push(`type=${encodeURIComponent(type)}`);
    }
    if (parentId !== undefined) {
      params.push(`parentId=${parentId}`);
    }

    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    return this.http.get<INode<T>[]>(url);
  }

  // Get nodes by type with hydrated relationships
  getNodesByType(type: string): Observable<INode<T>[]> {
    const url = `${this.apiUrl}/get-nodes-by-type.php?type=${encodeURIComponent(
      type
    )}`;
    return this.http.get<INode<T>[]>(url);
  }

  //get-nodes-by-company.php
  getNodesByCompany(companyId: number, type?: string): Observable<INode<T>[]> {
    let url = `${this.apiUrl}/get-nodes-by-company.php?company_id=${companyId}`;
    if (type) {
      url += `&type=${encodeURIComponent(type)}`;
    }
    return this.http.get<INode<T>[]>(url);
  }

  // Add a new node
  addNode(node: INode<T>): Observable<INode<T>> {
    const url = `${this.apiUrl}/add-node.php`;
    const cleanNode = this.cleanDataForSave(node);
    return this.http.post<INode<T>>(url, cleanNode);
  }

  // Update an existing node
  updateNode(node: INode<T>): Observable<INode<T>> {
    const url = `${this.apiUrl}/update-node.php`;
    const cleanNode = this.cleanDataForSave(node);
    return this.http.put<INode<T>>(url, cleanNode);
  }

  // Save helper (auto decides add/update)
  saveNode(node: INode<T>): Observable<INode<T>> {
    return node.id ? this.updateNode(node) : this.addNode(node);
  }

  // Delete a node by ID
  deleteNode(nodeId: number): Observable<any> {
    const url = `${this.apiUrl}/delete-node.php?nodeId=${nodeId}`;
    return this.http.delete(url);
  }

  // Batch add multiple nodes
  addNodesBatch(nodes: INode<T>[]): Observable<INode<T>[]> {
    const url = `${this.apiUrl}/add-nodes-batch.php`;
    const cleanNodes = nodes.map((node) => this.cleanDataForSave(node));
    return this.http.post<INode<T>[]>(url, { items: cleanNodes });
  }

  // Batch update multiple nodes
  updateNodesBatch(nodes: INode<T>[]): Observable<INode<T>[]> {
    const url = `${this.apiUrl}/update-nodes-batch.php`;
    const cleanNodes = nodes.map((node) => this.cleanDataForSave(node));
    return this.http.put<INode<T>[]>(url, { items: cleanNodes });
  }

  // Clean hydrated fields before saving (removes __ prefixed fields and ensures proper array formatting)
  private cleanDataForSave(node: any): any {
    if (!node) return node;

    const cleanNode = { ...node };

    // Clean data object if it exists
    if (cleanNode.data && typeof cleanNode.data === 'object') {
      const cleanData = { ...cleanNode.data };
      Object.keys(cleanData).forEach((key) => {
        if (key.startsWith('__')) {
          delete cleanData[key];
        }
      });
      cleanNode.data = cleanData;
    }

    return cleanNode;
  }

  // Helper method to ensure multi-select fields are arrays
  ensureMultiSelectArrays(data: any, multiSelectFields: string[]): any {
    if (!data || !multiSelectFields || multiSelectFields.length === 0) {
      return data;
    }

    const cleanData = { ...data };

    multiSelectFields.forEach((fieldKey) => {
      if (cleanData.hasOwnProperty(fieldKey)) {
        const value = cleanData[fieldKey];
        if (value !== null && value !== undefined && value !== '') {
          // Ensure it's an array
          if (!Array.isArray(value)) {
            cleanData[fieldKey] = [value];
          }
          // Filter out empty values from array
          cleanData[fieldKey] = cleanData[fieldKey].filter(
            (v: any) => v !== null && v !== undefined && v !== ''
          );
        } else {
          // Set empty multi-select to empty array
          cleanData[fieldKey] = [];
        }
      }
    });

    return cleanData;
  }

  // Helper method to get display value for relationship fields
  getDisplayValue(
    fieldKey: string,
    nodeData: any,
    labelField: string = 'name'
  ): string {
    const hydratedKey = `__${fieldKey}`;
    const hydratedValue = nodeData[hydratedKey];

    if (hydratedValue) {
      if (Array.isArray(hydratedValue)) {
        // Multi-relationship
        return hydratedValue
          .map((item) => this.extractLabelFromItem(item, labelField))
          .join(', ');
      } else {
        // Single relationship
        return this.extractLabelFromItem(hydratedValue, labelField);
      }
    }

    return nodeData[fieldKey] || '';
  }

  // Helper method to extract label with smart fallback
  private extractLabelFromItem(item: any, preferredLabelField: string): string {
    if (!item) return '';

    // Try the preferred label field first
    if (preferredLabelField && item[preferredLabelField]) {
      return String(item[preferredLabelField]);
    }

    // Try common name patterns
    const nameCandidates = [
      'name',
      'title',
      'label',
      // Auto-detect name_* fields
      ...Object.keys(item).filter((key) => key.startsWith('name_')),
    ];

    for (const candidate of nameCandidates) {
      if (item[candidate] && String(item[candidate]).trim()) {
        return String(item[candidate]);
      }
    }

    // Fallback to ID
    return item.id ? String(item.id) : '';
  }

  // Helper method to check if a field is a relationship field
  isRelationshipField(fieldKey: string, nodeData: any): boolean {
    return nodeData.hasOwnProperty(`__${fieldKey}`);
  }

  // Helper method to get hydrated relationship data
  getHydratedData(fieldKey: string, nodeData: any): any {
    return nodeData[`__${fieldKey}`];
  }
// ===== Add these helpers in NodeService =====
private round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Parse " R146 086,00 " → 146086 (handles spaces, nbsp, commas, currency) */
private parseMoneyRaw(v?: string | null): number | null {
  if (!v) return null;
  // normalize NBSP and trim
  const s = String(v).replace(/\u00a0/g, ' ').trim();
  // remove currency and spaces, keep digits, commas, dots
  const cleaned = s.replace(/[^\d.,-]/g, '');
  // If it looks like "146,086.00" (US) or "146.086,00" (EU/ZA), normalize to dot decimal
  // Heuristic: last separator is decimal
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let numeric = cleaned;

  if (lastComma > lastDot) {
    // comma as decimal → remove thousand dots/commas, keep comma as decimal then replace with dot
    numeric = cleaned.replace(/\./g, '').replace(/,/g, '.');
  } else {
    // dot as decimal or integers with commas as thousand → drop commas
    numeric = cleaned.replace(/,/g, '');
  }

  const n = Number(numeric);
  return Number.isFinite(n) ? n : null;
}

/** One-time fixer for company turnover */
private fixCompanyData(data: Company & { [k: string]: any }) {
  if ((data as any).company_fix_v1) return data; // idempotent guard

  const clone: any = { ...data };

  // Prefer the human-readable raw value if present and parseable
  const rawParsed = this.parseMoneyRaw(clone.company_turnover_raw);

  // Decide target numbers
  const needsDivide = (x: any) => typeof x === 'number' && Number.isFinite(x);

  if (rawParsed !== null) {
    // Trust the raw cell — it already encodes the intended value
    clone.turnover_estimated = this.round2(rawParsed);
    if (needsDivide(clone.turnover_actual) && !clone.turnover_actual) {
      // leave actual as-is if it’s legitimately zero; otherwise you can choose to set it too
    }
  } else {
    // Fall back to divide-by-100 for estimated
    if (needsDivide(clone.turnover_estimated)) {
      clone.turnover_estimated = this.round2(clone.turnover_estimated / 100);
    }
    // Optionally fix actual too if it exists
    if (needsDivide(clone.turnover_actual) && clone.turnover_actual !== 0) {
      clone.turnover_actual = this.round2(clone.turnover_actual / 100);
    }
  }

  // Mark as fixed
  clone.company_fix_v1 = true;
  return clone;
}
// ===== Replace your current fixCompanyTurnOver with this =====
fixCompanyTurnOver() {
  const url = `http://localhost:8080/api-nodes/node/get-nodes.php?type=company`;

  this.http.get<INode<Company>[]>(url).subscribe({
    next: (nodes) => {
      if (!nodes?.length) {
        console.log('No company nodes found.');
        return;
      }

      const fixed = nodes.map((n) => ({ ...n, data: this.fixCompanyData(n.data as any) }));

      this.updateNodesBatch(fixed).subscribe({
        next: (resp) => console.log('✅ Company turnover fixed:', resp),
        error: (err) => console.error('❌ Failed to update companies:', err),
      });
    },
    error: (err) => console.error('❌ Failed to fetch companies:', err),
  });
}

}
