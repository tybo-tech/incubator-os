import { Component, OnInit, HostListener, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs';
import { NavComponent } from "../nav/nav.component";
import { GlobalTaskModalComponent } from '../tasks/global-task-modal.component';
import { Task } from '../../../models/business.models';
import { INode } from '../../../models/schema';
import { AuthService } from '../../auth/auth.service';
import { ActivityLogService } from '../../services/activity-log.service';

@Component({
  selector: 'app-app-shell',
  imports: [RouterOutlet, CommonModule, NavComponent, GlobalTaskModalComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss'
})
export class AppShellComponent implements OnInit {
  showGlobalTaskModal = false;
  isMobileMenuOpen = false;

  private logSvc = inject(ActivityLogService);

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit() {
    this.auth.validateSession().subscribe({
      next: (res) => {
        if (!res?.valid) {
          this.auth.logout();
          this.router.navigate(['/login']);
        }
      },
      error: () => {
        this.auth.logout();
        this.router.navigate(['/login']);
      },
    });

    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
    ).subscribe((e) => {
      this.logSvc.log({ action: 'page_view', url: e.urlAfterRedirects }).subscribe();
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    // Close mobile drawer on tablet/desktop resize
    if (event.target.innerWidth >= 768) {
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
