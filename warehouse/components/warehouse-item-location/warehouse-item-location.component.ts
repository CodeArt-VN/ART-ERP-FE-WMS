import { Component, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, FormArray } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AlertController, LoadingController, NavController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { EnvService } from 'src/app/services/core/env.service';
import { lib } from 'src/app/services/static/global-functions';
import { WMS_ItemInLocationProvider, WMS_StorerProvider } from 'src/app/services/static/services.service';

@Component({
  selector: 'app-warehouse-item-location',
  templateUrl: './warehouse-item-location.component.html',
  styleUrls: ['./warehouse-item-location.component.scss'],
})
export class WarehouseItemLocationComponent extends PageBase {
  @Input() set setQuery(value) {
    this.query = value ? value : {};
    this.query.ToLocation = this.query.IDLocation;
    if (this.query.CreatedDateFrom) delete this.query.CreatedDateFrom;
    if (this.query.CreatedDateTo) delete this.query.CreatedDateTo;

    this.clearData();
    this.loadData(null);
  }

  constructor(
    public pageProvider: WMS_ItemInLocationProvider,
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

  preLoadData(event) {}

  loadData(event) {
    super.loadData(event);
  }

  loadedData(event) {
    this.items.forEach((i) => {
      i.QuantityExpected = lib.formatMoney(i.QuantityExpected, 0);
      i.QuantityOnHand = lib.formatMoney(i.QuantityOnHand, 0);
      i.QuantityPreallocated = lib.formatMoney(i.QuantityPreallocated, 0);
      i.QuantityAllocated = lib.formatMoney(i.QuantityAllocated, 0);
      i.QuantityPicked = lib.formatMoney(i.QuantityPicked, 0);
      i.QuantityOnHold = lib.formatMoney(i.QuantityOnHold, 0);
    });
    super.loadedData(event);
  }
}
