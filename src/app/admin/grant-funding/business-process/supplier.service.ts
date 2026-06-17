import { Injectable, Inject } from '@angular/core';
import { NodeService } from '../../../../services/node.service';
import { Supplier, SupplierCollection, DEFAULT_SUPPLIER_COLLECTION } from './supplier.models';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SupplierService {
  constructor(
    @Inject(NodeService) private nodeService: NodeService
  ) {}

  // Load supplier collection for a company
  loadSuppliers(companyId: number): Observable<SupplierCollection> {
    return this.nodeService.getNodes('supplier_collection', companyId).pipe(
      map((nodes: any[]) => {
        if (nodes.length > 0) {
          return nodes[0].data as SupplierCollection;
        }
        return { ...DEFAULT_SUPPLIER_COLLECTION };
      }),
      catchError(() => of({ ...DEFAULT_SUPPLIER_COLLECTION }))
    );
  }

  // Save supplier collection for a company
  saveSuppliers(companyId: number, supplierCollection: SupplierCollection): Observable<any> {
    const nodeData: any = {
      type: 'supplier_collection',
      parent_id: companyId,
      data: supplierCollection
    };

    // Check if we have an existing node
    return this.nodeService.getNodes('supplier_collection', companyId).pipe(
      map((nodes: any[]) => {
        if (nodes.length > 0) {
          // Update existing node
          nodeData.id = nodes[0].id;
          return this.nodeService.updateNode(nodeData);
        } else {
          // Create new node
          return this.nodeService.addNode(nodeData);
        }
      }),
      catchError(() => this.nodeService.addNode(nodeData))
    ).pipe(
      map((response: any) => response)
    );
  }

  // Add or update a supplier in the collection
  addOrUpdateSupplier(companyId: number, supplier: Supplier): Observable<any> {
    return this.loadSuppliers(companyId).pipe(
      map(supplierCollection => {
        // Check if supplier already exists
        const existingIndex = supplierCollection.suppliers.findIndex(s => s.id === supplier.id || s.name === supplier.name);
        
        if (existingIndex >= 0) {
          // Update existing supplier
          supplierCollection.suppliers[existingIndex] = {
            ...supplierCollection.suppliers[existingIndex],
            ...supplier,
            updated_date: new Date().toISOString()
          };
        } else {
          // Add new supplier
          supplierCollection.suppliers.push({
            ...supplier,
            id: supplier.id || `s_${Date.now()}`,
            created_date: supplier.created_date || new Date().toISOString(),
            updated_date: new Date().toISOString()
          });
        }
        
        return supplierCollection;
      }),
      map(supplierCollection => this.saveSuppliers(companyId, supplierCollection))
    ).pipe(
      map((response: any) => response)
    );
  }

  // Get a supplier by name
  getSupplierByName(companyId: number, supplierName: string): Observable<Supplier | undefined> {
    return this.loadSuppliers(companyId).pipe(
      map(supplierCollection => 
        supplierCollection.suppliers.find(s => s.name === supplierName)
      )
    );
  }

  // Check if a supplier exists
  supplierExists(companyId: number, supplierName: string): Observable<boolean> {
    return this.getSupplierByName(companyId, supplierName).pipe(
      map(supplier => supplier !== undefined)
    );
  }
}