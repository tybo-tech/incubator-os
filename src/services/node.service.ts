// src/services/node.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { INode } from '../models/schema';
import { Constants } from './service';

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
    const url = `${this.apiUrl}/get-nodes-by-type.php?type=${encodeURIComponent(type)}`;
    return this.http.get<INode<T>[]>(url);
  }

  // Add a new node
  addNode(node:INode<T>): Observable<INode<T>> {
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
    const cleanNodes = nodes.map(node => this.cleanDataForSave(node));
    return this.http.post<INode<T>[]>(url, { items: cleanNodes });
  }

  // Batch update multiple nodes
  updateNodesBatch(nodes: INode<T>[]): Observable<INode<T>[]> {
    const url = `${this.apiUrl}/update-nodes-batch.php`;
    const cleanNodes = nodes.map(node => this.cleanDataForSave(node));
    return this.http.put<INode<T>[]>(url, { items: cleanNodes });
  }

  // Clean hydrated fields before saving (removes __ prefixed fields and ensures proper array formatting)
  private cleanDataForSave(node: any): any {
    if (!node) return node;

    const cleanNode = { ...node };

    // Clean data object if it exists
    if (cleanNode.data && typeof cleanNode.data === 'object') {
      const cleanData = { ...cleanNode.data };
      Object.keys(cleanData).forEach(key => {
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

    multiSelectFields.forEach(fieldKey => {
      if (cleanData.hasOwnProperty(fieldKey)) {
        const value = cleanData[fieldKey];
        if (value !== null && value !== undefined && value !== '') {
          // Ensure it's an array
          if (!Array.isArray(value)) {
            cleanData[fieldKey] = [value];
          }
          // Filter out empty values from array
          cleanData[fieldKey] = cleanData[fieldKey].filter((v: any) =>
            v !== null && v !== undefined && v !== ''
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
  getDisplayValue(fieldKey: string, nodeData: any, labelField: string = 'name'): string {
    const hydratedKey = `__${fieldKey}`;
    const hydratedValue = nodeData[hydratedKey];

    if (hydratedValue) {
      if (Array.isArray(hydratedValue)) {
        // Multi-relationship
        return hydratedValue.map(item => this.extractLabelFromItem(item, labelField)).join(', ');
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
      ...Object.keys(item).filter(key => key.startsWith('name_'))
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
}
