import { Component } from '@angular/core';
import { DemoSeedService } from './core/services/demo-seed.service';

@Component({
  selector: 'app-root',
  template: '<router-outlet></router-outlet>'
})
export class AppComponent {
  constructor(seed: DemoSeedService) {
    seed.seedIfEmpty();
  }
}
