import { Component, OnInit, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavComponent } from "../nav/nav.component";
import { GlobalTaskModalComponent } from '../tasks/global-task-modal.component';
import { Task } from '../../../models/business.models';
import { INode } from '../../../models/schema';

@Component({
  selector: 'app-app-shell',
  imports: [RouterOutlet, CommonModule, NavComponent, GlobalTaskModalComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss'
})
export class AppShellComponent implements OnInit {
  showGlobalTaskModal = false;
  isMobileMenuOpen = false;

  constructor() {}

  ngOnInit() {
    // App shell initialization - no need to load companies anymore
    // Users will navigate through the proper hierarchy via Clients menu
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    // Close mobile menu on desktop resize
    if (event.target.innerWidth >= 1024) {
      this.isMobileMenuOpen = false;
    }
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  openGlobalTaskModal() {
    this.showGlobalTaskModal = true;
    // Close mobile menu when opening modal
    this.isMobileMenuOpen = false;
  }

  closeGlobalTaskModal() {
    this.showGlobalTaskModal = false;
  }

  onGlobalTaskSaved(task: INode<Task>) {
    console.log('✅ Global task saved:', task);
    // You could emit an event here or use a service to notify other components
  }
}
