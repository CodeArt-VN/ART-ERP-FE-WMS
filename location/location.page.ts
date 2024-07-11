import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, WMS_LocationProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { NavigationExtras } from '@angular/router';

@Component({
  selector: 'app-location',
  templateUrl: 'location.page.html',
  styleUrls: ['location.page.scss'],
})
export class LocationPage extends PageBase {
  constructor(
    public pageProvider: WMS_LocationProvider,
    public branchProvider: BRA_BranchProvider,
    public modalController: ModalController,
    public popoverCtrl: PopoverController,
    public alertCtrl: AlertController,
    public loadingController: LoadingController,
    public env: EnvService,
    public navCtrl: NavController,
    public location: Location,
  ) {
    super();
  }

  printQRCode() {
      let navigationExtras: NavigationExtras = {
        state: this.selectedItems.map((m) => {
          return {
            line1: m.Name,
            line2: m.Zone,
            qrCode: m.Id,
          };
        }),
      };
      this.nav('/qr-code-label', 'forward', navigationExtras);
    }
}
