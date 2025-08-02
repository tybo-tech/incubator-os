import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NodeService } from '../../../../services';
import { Company } from '../../../../models/business.models';
import { INode } from '../../../../models/schema';

@Component({
  selector: 'app-company-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './company-detail.component.html',
  styleUrl: './company-detail.component.scss'
})
export class CompanyDetailComponent implements OnInit {
  company: INode<Company> | null = null;
  activeTab: 'overview' | 'financial' | 'compliance' | 'documents' = 'overview';
  loading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private nodeService: NodeService<Company>
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadCompany(parseInt(id));
      }
    });
  }

  loadCompany(id: number) {
    this.loading = true;
    this.error = null;

    this.nodeService.getNodeById(id).subscribe({
      next: (company) => {
        this.company = company;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading company:', err);
        this.error = 'Failed to load company details';
        this.loading = false;
      }
    });
  }

  setActiveTab(tab: 'overview' | 'financial' | 'compliance' | 'documents') {
    this.activeTab = tab;
  }

  goBack() {
    this.router.navigate(['/companies']);
  }

  getComplianceColor(status: boolean): string {
    return status ? 'bg-green-500' : 'bg-red-500';
  }

  getBbbeeColor(level: string): string {
    switch (level?.toLowerCase()) {
      case 'eme': return 'bg-green-500';
      case 'qse': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
}
