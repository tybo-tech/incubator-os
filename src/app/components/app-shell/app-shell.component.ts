import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, CommonModule, SidebarComponent],
  template: `
    <div class="grid grid-cols-[250px_auto] h-screen">
      <!-- Sidebar -->
      <aside class="bg-gray-100 border-r border-gray-300 p-4">
        <app-sidebar></app-sidebar>
      </aside>

      <!-- Main Content -->
      <main class="overflow-y-auto p-6 bg-white">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      main {
        height: 100vh;
        overflow-y: auto;
      }

      aside {
        height: 100vh;
        overflow-y: auto;
      }
    `,
  ],
})
export class AppShellComponent {}
