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

  preLoadData(event) {
  }

  loadData(event) {
    this.query.SortBy = 'Id_desc';
    super.loadData(event);
  }

  loadedData(event) {
    super.loadedData(event);
    this.items.forEach((i) => {
      i.CreatedTimeText = i.CreatedDate ? lib.dateFormat(i.CreatedDate, 'hh:MM') : '';
      i.CreatedDateText = i.CreatedDate ? lib.dateFormat(i.CreatedDate, 'dd/mm/yy') : '';
      // i.UoMQuantity = lib.formatMoney(i.UoMQuantity, 0);
      i.CubeText = lib.formatMoney(i.Cube / 1000000, 3);
      i.GrossWeightText = lib.formatMoney(i.GrossWeight / 1000, 3);
    });
 
  }
  myHeaderFn(record, recordIndex, records) {
    if(recordIndex == 0){
      return lib.dateFormatFriendly(record.CreatedDate);
    }
    let b: any = recordIndex == 0 ? new Date() : new Date(records[recordIndex - 1].CreatedDate);//'2000-01-01'
    let a: any = new Date(record.CreatedDate);
    let mins = Math.floor((b - a) / 1000 / 60);
    
    
    if (mins < 30 ) {
      return null;
    }
    let lastRenderedDate =  lib.dateFormatFriendly(records[recordIndex - 1]?.CreatedDate)

    if(lastRenderedDate != lib.dateFormatFriendly(record.CreatedDate)) return lib.dateFormatFriendly(record.CreatedDate);
    return null;

  }
}