import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProfileMenuComponent } from '@app/components/profile-menu/profile-menu.component';

@Component({
    selector: 'app-main-page',
    templateUrl: './main-page.component.html',
    styleUrls: ['./main-page.component.scss'],
    imports: [RouterLink, ProfileMenuComponent],
    standalone: true,
})
export class MainPageComponent {}
