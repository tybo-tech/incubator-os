import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Observable } from 'rxjs';
import { INode } from '../../../models/schema';
import { NodeService } from '../../../services';
import { CollectionFormComponent } from '../collection-form/collection-form.component';
import { 
  LucideAngularModule, 
  Home, 
  FolderOpen, 
  Edit, 
  Plus,
  Folder,
  Table
} from 'lucide-angular';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink, 
    RouterLinkActive, 
    CollectionFormComponent,
    LucideAngularModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent implements OnInit {
  collections$!: Observable<INode[]>;
  showCollectionForm = false;
  editingCollection: INode | null = null;

  // Lucide Icons
  readonly HomeIcon = Home;
  readonly FolderIcon = Folder;
  readonly EditIcon = Edit;
  readonly PlusIcon = Plus;
  readonly TableIcon = Table;

  constructor(
    private nodeService: NodeService
  ) {}

  ngOnInit() {
    this.loadCollections();
  }

  private loadCollections() {
    this.collections$ = this.nodeService.getNodesByType('collection');
  }

  onAddCollection() {
    console.log('Add collection clicked - showing form');
    this.editingCollection = null;
    this.showCollectionForm = true;
    console.log('showCollectionForm is now:', this.showCollectionForm);
  }

  onEditCollection(collection: INode) {
    this.editingCollection = collection;
    this.showCollectionForm = true;
  }

  onCollectionSaved(savedCollection: INode) {
    console.log('Collection saved:', savedCollection);
    this.showCollectionForm = false;
    this.editingCollection = null;
    // Refresh the collections list
    this.loadCollections();
  }

  onCollectionFormCancelled() {
    this.showCollectionForm = false;
    this.editingCollection = null;
  }
}
