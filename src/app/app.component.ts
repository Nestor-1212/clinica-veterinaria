import { Component, inject } from '@angular/core';
import { DemoSeedService } from './core/services/demo-seed.service';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-root',
    template: '<router-outlet></router-outlet>',
    imports: [RouterOutlet]
})
export class AppComponent {
  constructor() {
    const seed = inject(DemoSeedService);

    seed.seedIfEmpty();
  }
}
