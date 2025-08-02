import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { INode } from '../../../models/schema';
import { NodeService } from '../../../services';
import { LucideAngularModule, Database, FileText, Eye, ChevronRight } from 'lucide-angular';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss'
})
export class OverviewComponent implements OnInit {
  collections$!: Observable<INode[]>;
  totalCollections = 0;
  totalRecords = 0;

  // Lucide Icons
  readonly DatabaseIcon = Database;
  readonly FileTextIcon = FileText;
  readonly EyeIcon = Eye;
  readonly ChevronRightIcon = ChevronRight;

  constructor(
    private nodeService: NodeService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  private loadDashboardData() {
    this.collections$ = this.nodeService.getNodesByType('collection');
    
    // Calculate totals (mock for now)
    this.collections$.subscribe(collections => {
      this.totalCollections = collections.length;
      this.totalRecords = collections.length * 12; // Mock calculation
    });
  }

  onViewCollection(collection: INode) {
    this.router.navigate(['/collection', collection.id]);
  }
}
