import { Component, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, FormArray } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AlertController, LoadingController, ModalController, NavController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { PageBase } from 'src/app/page-base';
import { EnvService } from 'src/app/services/core/env.service';
import { lib } from 'src/app/services/static/global-functions';
import {
  BRA_BranchProvider,
  CRM_ContactProvider,
  WMS_ItemProvider,
  WMS_LocationProvider,
  WMS_TransactionProvider,
  WMS_ZoneProvider,
} from 'src/app/services/static/services.service';
import { concat, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';

@Component({
  selector: 'app-warehouse-transaction',
  templateUrl: './warehouse-transaction.page.html',
  styleUrls: ['./warehouse-transaction.page.scss'],
})
export class WarehouseTransactionPage extends PageBase {
  branchList = [];
  zoneList = [];
  storerList = [];
  locationList = [];
  selectedBranch = null;
  selectedStorer = null;
  selectedZone = null;
  selectedLocation = null;
  selectedItem = null;
  fromDate = '';
  toDate = '';
  isFristLoaded = true;
  constructor(
    public pageProvider: WMS_TransactionProvider,
    public env: EnvService,
    public route: ActivatedRoute,
    public alertCtrl: AlertController,
    public navCtrl: NavController,
    public formBuilder: FormBuilder,
    public cdr: ChangeDetectorRef,
    public loadingController: LoadingController,

    public branchProvider: BRA_BranchProvider,
    public contactProvider: CRM_ContactProvider,
    public zoneProvider: WMS_ZoneProvider,
    public locationProvider: WMS_LocationProvider,
    public itemProvider: WMS_ItemProvider,
    public modalController: ModalController,

    public translate: TranslateService,
  ) {
    super();
    this.pageConfig.isShowFeature = true;
  }

  preLoadData(event) {

    this.branchProvider
      .read({
        Skip: 0,
        Take: 5000,
        Type: 'Warehouse',
        AllParent: true,
        Id: this.env.selectedBranchAndChildren,
      })
      .then((resp) => {
        lib.buildFlatTree(resp['data'], this.branchList).then((result: any) => {
          this.branchList = result;
          this.branchList.forEach((i) => {
            i.disabled = true;
          });
          this.markNestedNode(this.branchList, this.env.selectedBranch);
          this.loadedData(event);
        });
      });
    this.contactProvider.read({ IsStorer: true }).then((resp) => {
      this.storerList = resp['data'];
    });
  }

  loadData(event) {
    this.query.SortBy = 'Id_desc';
    super.loadData(event);
  }

  loadedData(event) {
    this.items.forEach((i) => {
      i.CreatedTimeText = i.CreatedDate ? lib.dateFormat(i.CreatedDate, 'hh:MM') : '';
      i.CreatedDateText = i.CreatedDate ? lib.dateFormat(i.CreatedDate, 'dd/mm/yy') : '';
      i.CubeText = lib.formatMoney(i.Cube / 1000000, 3);
      i.GrossWeightText = lib.formatMoney(i.GrossWeight / 1000, 3);
    });
    super.loadedData(event);
    if (this.isFristLoaded) {
      this.isFristLoaded = false;
      this.itemSearch();
    }
  }

  itemList$;
  itemListLoading = false;
  itemListInput$ = new Subject<string>();
  itemListSelected = [];

  itemSearch() {
    this.itemListLoading = false;
    this.itemList$ = concat(
      of(this.itemListSelected),
      this.itemListInput$.pipe(
        distinctUntilChanged(),
        tap(() => (this.itemListLoading = true)),
        switchMap((term) =>
          this.itemProvider.search({ Take: 20, Skip: 0, Term: term }).pipe(
            catchError(() => of([])), // empty list on error
            tap(() => (this.itemListLoading = false)),
          ),
        ),
      ),
    );
  }

  changeFilter() {
    this.items = [];
    if (this.selectedBranch) {
      this.query.IDBranch = this.selectedBranch?.Id;
      this.query.IDStorer = this.selectedStorer?.Id;
      this.query.IDZone = this.selectedZone?.Id;
      this.query.IDLocation = this.selectedLocation?.Id;
      this.query.IDItem = this.selectedItem?.Id;
      if (this.fromDate) this.query.CreatedDateFrom = this.fromDate;
      if (this.toDate) this.query.CreatedDateTo = this.toDate;
      this.pageConfig.isEndOfData = false;
      this.loadData(null);
    }
  }

  selectBranch() {
    if (!this.selectedBranch) {
      this.changeFilter();
    } else {
      this.zoneProvider.read({ IDBranch: this.selectedBranch.Id }).then((resp) => {
        this.zoneList = resp['data'];
        let translateResult;
        this.translate.get('all').subscribe((message: string) => {
          translateResult = message;
        });
        this.selectZone();
      });
    }
  }

  selectZone() {
    if (!this.selectedZone) {
      this.changeFilter();
    } else {
      this.locationProvider
        .read({
          IDBranch: this.selectedBranch.Id,
          IDZone: this.selectedZone.Id,
        })
        .then((resp) => {
          this.locationList = resp['data'];
          let translateResult;
          this.translate.get('all').subscribe((message: string) => {
            translateResult = message;
          });
          this.changeFilter();
        });
    }
  }

  private markNestedNode(ls, Id) {
    let current = ls.find((d) => d.Id == Id);
    if (current) {
      current.disabled = current.Type != 'Warehouse';
      ls.filter((d) => d.IDParent == Id).forEach((i) => {
        if (i.Type == 'Warehouse') i.disabled = false;
        this.markNestedNode(ls, i.Id);
      });
    }
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
