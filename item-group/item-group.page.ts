import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { WMS_ItemGroupProvider } from 'src/app/services/static/services.service';

@Component({
  selector: 'app-item-group',
  templateUrl: 'item-group.page.html',
  styleUrls: ['item-group.page.scss'],
})
export class ItemGroupPage extends PageBase {
  dataItemGroup: any = [];
  isAllRowOpened = true;

  constructor(
    public pageProvider: WMS_ItemGroupProvider,
    public modalController: ModalController,
    public popoverCtrl: PopoverController,
    public alertCtrl: AlertController,
    public loadingController: LoadingController,
    public env: EnvService,
    public navCtrl: NavController,
  ) {
    super();
    this.query.Take = 5000;
    this.query.AllChildren = true;
    this.query.AllParent = true;
  }

  loadedData(event) {
    this.buildFlatTree(this.items, this.dataItemGroup, this.isAllRowOpened).then((resp: any) => {
      this.dataItemGroup = resp;
    });
    super.loadedData(event);
  }

  toggleRowAll() {
    this.isAllRowOpened = !this.isAllRowOpened;
    this.dataItemGroup.forEach((i) => {
      i.showdetail = !this.isAllRowOpened;
      this.toggleRow(this.dataItemGroup, i, true);
    });
  }

}
