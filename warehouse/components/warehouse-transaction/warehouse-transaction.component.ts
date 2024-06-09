import { Component, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, FormArray } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AlertController, LoadingController, NavController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { EnvService } from 'src/app/services/core/env.service';
import { lib } from 'src/app/services/static/global-functions';
import { WMS_TransactionProvider } from 'src/app/services/static/services.service';

@Component({
  selector: 'app-warehouse-transaction',
  templateUrl: './warehouse-transaction.component.html',
  styleUrls: ['./warehouse-transaction.component.scss'],
})
export class WarehouseTransactionComponent extends PageBase {
  @Input() set showSearch(value) {
    this.pageConfig.isShowSearch = value;
  }
  @Input() set setQuery(value) {
    this.query = value ? value : {};
    this.query.ToLocation = this.query.IDLocation;
    if (this.query.CreatedDateTo) {
      this.query.CreatedDateTo += 'T23:59:59';
    }
    this.clearData();
    this.loadData(null);
  }

  constructor(
    public pageProvider: WMS_TransactionProvider,
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
      i.CreatedTimeText = i.CreatedDate ? lib.dateFormat(i.CreatedDate, 'hh:MM') : '';
      i.CreatedDateText = i.CreatedDate ? lib.dateFormat(i.CreatedDate, 'dd/mm/yy') : '';
      // i.UoMQuantity = lib.formatMoney(i.UoMQuantity, 0);
      i.CubeText = lib.formatMoney(i.Cube / 1000000, 3);
      i.GrossWeightText = lib.formatMoney(i.GrossWeight / 1000, 3);
    });
    super.loadedData(event);
  }

  myHeaderFn(record, recordIndex, records) {
    let a: any = recordIndex == 0 ? new Date('2000-01-01') : new Date(records[recordIndex - 1].CreatedDate);
    let b: any = new Date(record.CreatedDate);
    let mins = Math.floor((b - a) / 1000 / 60);

    if (mins < 30) {
      return null;
    }
    return lib.dateFormatFriendly(record.CreatedDate);
    // return {
    //   CreatedTimeText: record.CreatedDate ? lib.dateFormat(record.CreatedDate, 'hh:MM') : '',
    //   CreatedDateText: record.CreatedDate ? lib.dateFormat(record.CreatedDate, 'dd/mm/yy') : ''
    // }
  }
}
