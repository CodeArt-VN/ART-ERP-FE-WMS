import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { WMS_UoMProvider } from 'src/app/services/static/services.service';
import { UoMDetailPage } from '../uom-detail/uom-detail.page';

@Component({
    selector: 'app-uom',
    templateUrl: 'uom.page.html',
    styleUrls: ['uom.page.scss'],
    standalone: false
})
export class UoMPage extends PageBase {
  constructor(
    public pageProvider: WMS_UoMProvider,
    public modalController: ModalController,
    public alertCtrl: AlertController,
    public loadingController: LoadingController,
    public env: EnvService,
    public navCtrl: NavController,
  ) {
    super();
    this.pageConfig.forceLoadData = true;
  }

  async showModal(i) {
    const modal = await this.modalController.create({
      component: UoMDetailPage,
      componentProps: {
        item: i,
        id: i.Id,
      },
      cssClass: 'my-custom-class',
    });
    return await modal.present();
  }

  add() {
    let newItem = {
      Id: 0,
      IsDisabled: false,
    };
    this.showModal(newItem);
  }
}
