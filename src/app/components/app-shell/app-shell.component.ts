import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavComponent } from "../nav/nav.component";
import { GlobalTaskModalComponent } from '../tasks/global-task-modal.component';
import { Task } from '../../../models/business.models';
import { INode } from '../../../models/schema';

@Component({
  selector: 'app-app-shell',
  imports: [RouterOutlet, NavComponent, GlobalTaskModalComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss'
})
export class AppShellComponent implements OnInit {
  showGlobalTaskModal = false;

  constructor() {}

  ngOnInit() {
    // App shell initialization - no need to load companies anymore
    // Users will navigate through the proper hierarchy via Clients menu
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
