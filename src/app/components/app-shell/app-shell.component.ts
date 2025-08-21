import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavComponent } from "../nav/nav.component";
import { GlobalTaskModalComponent } from '../tasks/global-task-modal.component';
import { Task } from '../../../models/business.models';
import { INode } from '../../../models/schema';
import { NodeService } from '../../../services';
import { ICompany } from '../../../models/simple.schema';
import { CompanyService } from '../../../services/company.service';

@Component({
  selector: 'app-app-shell',
  imports: [RouterOutlet, NavComponent, GlobalTaskModalComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss'
})
export class AppShellComponent implements OnInit {
  showGlobalTaskModal = false;
  availableCompanies: ICompany[] = [];

  constructor(private nodeService: CompanyService) {}

  ngOnInit() {
    this.loadCompanies();
  }

  async loadCompanies() {
    try {
      const companies = await this.nodeService.listCompanies().toPromise();
      this.availableCompanies = companies || [];
    } catch (error) {
      console.error('❌ Error loading companies:', error);
    }
  }

  openGlobalTaskModal() {
    this.showGlobalTaskModal = true;
  }

  closeGlobalTaskModal() {
    this.showGlobalTaskModal = false;
  }

  onGlobalTaskSaved(task: INode<Task>) {
    console.log('✅ Global task saved:', task);
    // You could emit an event here or use a service to notify other components
  }
}
