import { Component, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, FormArray } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AlertController, LoadingController, NavController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { EnvService } from 'src/app/services/core/env.service';
import { lib } from 'src/app/services/static/global-functions';
import { WMS_LotLPNLocationProvider, WMS_StorerProvider } from 'src/app/services/static/services.service';

@Component({
  selector: 'app-warehouse-item-location-lot-lpn',
  templateUrl: './warehouse-item-location-lot-lpn.component.html',
  styleUrls: ['./warehouse-item-location-lot-lpn.component.scss'],
})
export class WarehouseItemLocationLotLpnComponent extends PageBase {
  @Input() set setQuery(value) {
    this.query = value ? value : {};
    this.query.ToLocation = this.query.IDLocation;
    if (this.query.CreatedDateTo) {
      this.query.CreatedDateTo += 'T23:59:59'
    }
    this.clearData();
    this.loadData(null);
  };

  constructor(
    public pageProvider: WMS_LotLPNLocationProvider,
    public env: EnvService,
    public route: ActivatedRoute,
    public alertCtrl: AlertController,
    public navCtrl: NavController,
    public formBuilder: FormBuilder,
    public cdr: ChangeDetectorRef,
    public loadingController: LoadingController,
  ) {
    super();
  }

  preLoadData(event) { }

  loadData(event) {
    super.loadData(event);
  }

  loadedData(event) {
    this.items.forEach(i => {
      i.QuantityExpected = lib.formatMoney(i.QuantityExpected, 0);
      i.QuantityOnHand = lib.formatMoney(i.QuantityOnHand, 0);
      i.QuantityAllocated = lib.formatMoney(i.QuantityAllocated, 0);
      i.QuantityPicked = lib.formatMoney(i.QuantityPicked, 0);
      i.QuantityPickInProcess = lib.formatMoney(i.QuantityPickInProcess, 0);
      i.QuantityPendingMoveIn = lib.formatMoney(i.QuantityPendingMoveIn, 0);
    });
    super.loadedData(event);
  }
}

