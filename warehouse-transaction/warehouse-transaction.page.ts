import { Component, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, FormArray } from '@angular/forms';
import { ActivatedRoute, NavigationExtras, Router } from '@angular/router';
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
    standalone: false
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
    public router: Router,
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
    this.formGroup = this.formBuilder.group({
      IDItem:[''],
      IDBranch:['',Validators.required],
      IDStorer:[''],
      IDZone:[''],
      TransactionDateFrom:[this.dateMinusMonths(1),Validators.required],
      TransactionDateTo:[this.getCurrentDate(),Validators.required],
      IsExcludeInternalTransaction:[false],
      _IDItemDataSource:this.buildSelectDataSource((term) => {
        return this.itemProvider.search({ 
           SortBy: ['Id_desc'],Take: 200, Skip: 0, Term: term });
      }),
    });
  }

  preLoadData(event) {
    this.branchList = [...this.env.branchList];
    this.contactProvider.read({ IsStorer: true }).then((resp) => {
      this.storerList = resp['data'];
    })
    this.route.queryParams.subscribe((params) => {
      if(this.router.getCurrentNavigation()?.extras.state){
        this.formGroup.patchValue(this.router.getCurrentNavigation()?.extras.state);
        this.formGroup.get('_IDItemDataSource').value.selected.push(this.router.getCurrentNavigation().extras.state.Item);
        this.formGroup.get('_IDItemDataSource').value.initSearch();
        this.selectedItem = this.router.getCurrentNavigation().extras.state.Item;
      } 
      super.preLoadData(event);
    })
  }

  loadData(event) {
    this.query = this.formGroup.getRawValue();
    delete this.query._IDItemDataSource;
    this.query.SortBy = 'Id_desc';
    super.loadData(event);
  }

  loadedData(event?: any, ignoredFromGroup?: boolean): void {
    super.loadedData(event, ignoredFromGroup);
   
    this.formGroup.get('_IDItemDataSource').value.initSearch();
    this.formGroup.enable();
    if(!this.formGroup.get('IDBranch').value){
      this.getNearestWarehouse(this.env.selectedBranch);
    }
    if (this.isFristLoaded) {
      this.isFristLoaded = false;
    }
 
  }
  
  getNearestWarehouse(IDBranch) {
    let currentBranch = this.env.branchList.find((d) => d.Id == IDBranch);
    if(currentBranch){
      if(currentBranch.Type == 'Warehouse'){
        this.formGroup.get('IDBranch').setValue(currentBranch.Id);
        return true;
      }
      else {
        let childrentWarehouse:any =  this.env.branchList.filter((d) => d.IDParent == IDBranch);
        for(let child of childrentWarehouse){
          if(this.getNearestWarehouse(child.Id)){
            return true;
          }
        }
      }
    }
  }
  
  changeFilter() {
    if(this.formGroup.invalid) return;
    const fromDate = new Date(this.formGroup.controls.TransactionDateFrom.value);
    const toDate = new Date(this.formGroup.controls.TransactionDateTo.value);
    if(fromDate > toDate )
    {
      this.env.showMessage('From date must be earlier than or equal to the To date!','danger');
      return;
    }
    const maxAllowedDate = new Date(fromDate);
    maxAllowedDate.setMonth(maxAllowedDate.getMonth() + 3);
    
    if (toDate > maxAllowedDate) {
      this.env.showMessage('The difference between From Date and To Date should not exceed 3 months.', 'danger');
      return;
    }
    this.items = [];
    this.pageConfig.isEndOfData = false;
    this.loadData(null);
   }

  changeIDBranch() {
    if (!this.formGroup.get('IDBranch').value) {
      this.zoneList = [];
      this.formGroup.get('');
    } else {
      this.zoneProvider.read({ IDBranch:this.formGroup.get('IDBranch').value }).then((resp) => {
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
    if (!this.formGroup.get('IDZone').value) {
      this.changeFilter();
    } 
    else {
      this.locationProvider
        .read({
          IDBranch: this.formGroup.get('IDBranch').value,
          IDZone: this.formGroup.get('IDZone').value,
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
  changeItem(ev){
    this.selectedItem = ev;
    this.changeFilter();
  }
  createWarehouseCard(){
    if(this.selectedItem && this.formGroup.valid){
      let navigationExtras: NavigationExtras = {
        state: {
          items: this.items,
          query:this.query,
          Item : this.selectedItem
        },
      };
      this.nav('/warehouse-card', 'forward', navigationExtras);
    }
    
  }
  dateMinusMonths(months: number): string {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  }
  
  getCurrentDate(): string {
    return new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
  }
}
