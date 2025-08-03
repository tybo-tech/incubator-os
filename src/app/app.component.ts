import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NodeService } from '../services';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'nodes';
  constructor(private nodeService: NodeService<any>) {
  }

}
