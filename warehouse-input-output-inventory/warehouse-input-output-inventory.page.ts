import { Component, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, FormArray } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AlertController, LoadingController, NavController } from '@ionic/angular';

import { PageBase } from 'src/app/page-base';
import { CommonService } from 'src/app/services/core/common.service';
import { EnvService } from 'src/app/services/core/env.service';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { lib } from 'src/app/services/static/global-functions';
import {
  AC_PostingPeriodProvider,
  BRA_BranchProvider,
  CRM_ContactProvider,
  WMS_ItemGroupProvider,
  WMS_ItemProvider,
  WMS_TransactionProvider,
} from 'src/app/services/static/services.service';

import { concat, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';

@Component({
  selector: 'app-warehouse-input-output-inventory',
  templateUrl: './warehouse-input-output-inventory.page.html',
  styleUrls: ['./warehouse-input-output-inventory.page.scss'],
  standalone: false,
})
export class WarehouseInputOutputInventoryPage extends PageBase {
  selectedBranch;
  branchList = [];
  storerList = [];
  itemGroupList = [];
  periodList = [];
  isFristLoaded = true;
  itemGroup = [];
  isAllRowOpened = true;
  constructor(
    public pageProvider: WMS_TransactionProvider,
    public env: EnvService,
    public route: ActivatedRoute,
    public itemGroupProvider: WMS_ItemGroupProvider,
    public alertCtrl: AlertController,
    public navCtrl: NavController,
    public formBuilder: FormBuilder,
    public cdr: ChangeDetectorRef,
    public loadingController: LoadingController,
    public postingPeriodProvider: AC_PostingPeriodProvider,
    public branchProvider: BRA_BranchProvider,
    public contactProvider: CRM_ContactProvider,
    public itemProvider: WMS_ItemProvider,
  ) {
    super();
    this.pageConfig.isShowFeature = true;
    this.formGroup = formBuilder.group({
      IDBranch: ['', Validators.required],
      IDStorer: [''],
      IDItemGroup: [''],
      IDItem: [''],
      IDPeriod: [''],
      IsShowInputOutputHasData: [true],
      ViewItemGroup : [false],
      FromDate: [this.getFormattedDate(new Date())],
      ToDate: [this.getFormattedDate(new Date())],
    });
    this.pageConfig.isShowFeature = true;
    this.pageConfig.isFeatureAsMain = true;
    this.pageConfig.canExport = true;
  }

  preLoadData(event) {
    Promise.all([
      this.contactProvider.read({ IsStorer: true, Take: 20, Skip: 0, SkipAddress: true }),
      this.postingPeriodProvider.read(),
      this.itemGroupProvider.read({Take: 5000}),
    ]).then((values: any) => {
      if (values[0] && values[0].data) {
        this._storerDataSource.selected.push(...values[0].data);
      }
      if (values[1] && values[1].data) {
        this.periodList = values[1].data;
        let all = { Code: 'Khác', Id: 0 };
        this.periodList.unshift(all);
      }
      if (values[2] && values[2].data) {
        lib.buildFlatTree(values[2].data, []).then((result: any) => {
          this.itemGroupList = result;
        });
      }
      this.branchList = lib.cloneObject(this.env.branchList);
      this.loadedData(event);
    });
  }

  loadData(event) {
    if (this.formGroup.get('FromDate').value > this.formGroup.get('ToDate').value) {
      this.env.showMessage('From date cannot be lower than to date!', 'danger');
      return;
    }
    if (this.formGroup.invalid) {
      return;
    }
    this.formGroup.markAsPristine();
    this.items = [];
    this.getInputOutputInventory();
    this.pageConfig.showSpinner = false;
  }

  loadedData(event) {
    super.loadedData(event);
    this.getNearestWarehouse(this.env.selectedBranch);
    if (this.isFristLoaded) {
      this.isFristLoaded = false;
      this._storerDataSource.initSearch();
      this._IDItemDataSource.initSearch();
    }
  }
  
 async export() {
  let query = this.formGroup.getRawValue();
  this.env
      .showLoading('Please wait for a few moments',  this.pageProvider.commonService.connect('GET', 'WMS/Transaction/ExportInputOutputInventory/', query).toPromise())
      .then((response: any) => {
        this.downloadURLContent(response);
      })
      .catch((err) => {
        //this.submitAttempt = false;
      });
 }

  getFormattedDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  _storerDataSource = {
    searchProvider: this.contactProvider,
    loading: false,
    input$: new Subject<string>(),
    selected: [],
    items$: null,
    that: this,
    initSearch() {
      this.loading = false;
      this.items$ = concat(
        of(this.selected),
        this.input$.pipe(
          distinctUntilChanged(),
          tap(() => (this.loading = true)),
          switchMap((term) => {
            if (!term) {
              this.loading = false;
              return of(this.selected);
            } else {
              return this.searchProvider
                .search({
                  Term: term,
                  SortBy: ['Id_desc'],
                  Take: 20,
                  Skip: 0,
                  IsStorer: true,
                  SkipAddress: true,
                })
                .pipe(
                  catchError(() => of([])), // empty list on error
                  tap(() => (this.loading = false)),
                );
            }
          }),
        ),
      );
    },
  };
  changePeriod() {
    if (this.formGroup.get('IDPeriod').value) {
      let selectedPeriod = this.periodList.find((d) => d.Id == this.formGroup.get('IDPeriod').value);
      this.formGroup.get('FromDate').setValue(selectedPeriod?.PostingDateFrom?.substring(0, 10));
      this.formGroup.get('ToDate').setValue(selectedPeriod?.PostingDateTo?.substring(0, 10));
    }
  }
  // changeFilter() {
  //   // this.formGroup.updateValueAndValidity();
  //   if(this.formGroup.get('FromDate').value> this.formGroup.get('ToDate').value){
  //     this.env.showMessage('From date cannot be lower than to date!', 'danger');
  //     return;
  //   }
  //   if(this.formGroup.invalid){
  //     return;
  //   }
  //   this.formGroup.markAsPristine();
  //   this.items = [];
  //   this.query = this.formGroup.getRawValue();
  //   this.getInputOutputInventory();
  // }

  recurDifference(resp : any) {
    this.items = resp.filter((d)=> (d.HasChild && resp.some(s=> d.Id== s.IDParent) )|| d.IDItem)
    if(this.items.some(d =>!this.items.some(f => f.IDParent == d.Id))){
     this.recurDifference(this.items);
   }
}

  getInputOutputInventory(event = null) {
    let query = this.formGroup.getRawValue();
    this.pageConfig.isSubActive = true; 
    this.itemGroup = [];
    if(query.ViewItemGroup){
      this.pageProvider.commonService.connect('GET', 'WMS/ItemGroup/', {Take:5000}).toPromise()
      .then((result: any) => {
       this.itemGroup = result.map((x) =>{
        return {IDParent: x.IDParent,Id: x.Id,Code : x.Code ,ItemName: x.Name ,
          _OpenQuantity:'', _InputQuantity:'', _OutputQuantity:'', _ClosingQuantity:''}
       });
      });
    }
   
    this.env
      .showLoading(
        'Please wait for a few moments',
        this.pageProvider.commonService.connect('GET', 'WMS/Transaction/InputOutputInventory/', query).toPromise(),
      )
      .then((result: any) => {
        if (result) {
          result.forEach((m) => {
            m._OpenQuantity = 0;
            m._InputQuantity =0;
            m._OutputQuantity = 0;
            m._ClosingQuantity = 0;
            if (m._SplitUoMs_OpenQuantity.length > 0) {
              m._OpenQuantity = m._SplitUoMs_OpenQuantity.map((x) => x.Quantity + ' ' + x.UoMName).join(' + ');
            }
            if (m._SplitUoMs_InputQuantity.length > 0) {
              m._InputQuantity = m._SplitUoMs_InputQuantity.map((x) => x.Quantity + ' ' + x.UoMName).join(' + ');
            }
            if (m._SplitUoMs_OutputQuantity.length > 0) {
              m._OutputQuantity = m._SplitUoMs_OutputQuantity.map((x) => x.Quantity + ' ' + x.UoMName).join(' + ');
            }
            if (m._SplitUoMs_ClosingQuantity.length > 0) {
              m._ClosingQuantity = m._SplitUoMs_ClosingQuantity.map((x) => x.Quantity + ' ' + x.UoMName).join(' + ');
            }
          });
          if(query.ViewItemGroup){
            result = result.map((x) => {return{...x,IDParent : x.IDItemGroup}});
            this.itemGroup = [...this.itemGroup, ...result];
            this.buildFlatTree(this.itemGroup, this.items, this.isAllRowOpened).then((resp: any) => {
              this.items = resp.map((x)=> {
                if(x.IDItem) return {...x,HasChild: false};
                else return x
              }).filter((d)=> d.HasChild || d.IDItem);
              this.recurDifference(this.items);
            });
          }else{
            // this.buildFlatTree(result, this.items, this.isAllRowOpened).then((resp: any) => {
            //   this.items = resp;
            // });
            this.items = result;
          }
         
          //this.items = this.itemGroup;
        }
      })
      .catch((err) => {
        console.log(err);
        this.env.showMessage('error!', 'danger');
      });
  }

  getNearestWarehouse(IDBranch) {
    let currentBranch = this.env.branchList.find((d) => d.Id == IDBranch);
    if (currentBranch) {
      if (currentBranch.Type == 'Warehouse') {
        this.formGroup.get('IDBranch').setValue(currentBranch.Id);
        return true;
      } else {
        let childrentWarehouse: any = this.env.branchList.filter((d) => d.IDParent == IDBranch);
        for (let child of childrentWarehouse) {
          if (this.getNearestWarehouse(child.Id)) {
            return true;
          }
        }
      }
    }
  }

  toggleRowAll() {
    this.isAllRowOpened = !this.isAllRowOpened;
    this.items.forEach((i) => {
      i.showdetail = !this.isAllRowOpened;
      this.toggleRow(this.items, i, true);
    });
  }
  toggleRow(ls, ite, toogle = false) {
    if (ite && ite.showdetail && toogle) {
      //hide
      ite.showdetail = false;
      this.showHideAllNestedFolder(ls, ite.Id, false, ite.showdetail);
    } else if (ite && !ite.showdetail && toogle) {
      //show loaded
      ite.showdetail = true;
      this.showHideAllNestedFolder(ls, ite.Id, true, ite.showdetail);
    }
  }

  IDPeriodDataSource = {
    searchProvider: this.postingPeriodProvider,
    loading: false,
    input$: new Subject<string>(),
    selected: [],
    items$: null,
    initSearch() {
      this.loading = false;
      this.items$ = concat(
        of(this.selected),
        this.input$.pipe(
          distinctUntilChanged(),
          tap(() => (this.loading = true)),
          switchMap((term) =>
            this.searchProvider
              .search({
                SortBy: ['Id_desc'],
                Take: 20,
                Skip: 0,
                Term: term,
              })
              .pipe(
                catchError(() => of([])), // empty list on error
                tap(() => (this.loading = false)),
              ),
          ),
        ),
      );
    },
  };

  _IDItemDataSource = {
    searchProvider: this.itemProvider,
    loading: false,
    input$: new Subject<string>(),
    selected: [],
    items$: null,
    that: this,
    initSearch() {
      this.loading = false;
      this.items$ = concat(
        of(this.selected),
        this.input$.pipe(
          distinctUntilChanged(),
          tap(() => (this.loading = true)),
          switchMap((term) =>
            this.searchProvider
              .search({
                Take: 20,
                Skip: 0,
                AllUoM: true,
                IDItemGroup: this.that.formGroup.get('IDItemGroup').value
                  ? `[${this.that.formGroup.get('IDItemGroup').value.join(',')}]`
                  : '[]',
                Term: term,
              })
              .pipe(
                catchError(() => of([])), // empty list on error
                tap(() => (this.loading = false)),
              ),
          ),
        ),
      );
    },
  };
}
