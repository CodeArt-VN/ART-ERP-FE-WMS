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
} from 'src/app/services/static/services.service';

import { concat, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';

@Component({
    selector: 'app-warehouse-input-output-inventory',
    templateUrl: './warehouse-input-output-inventory.page.html',
    styleUrls: ['./warehouse-input-output-inventory.page.scss'],
    standalone: false
})
export class WarehouseInputOutputInventoryPage extends PageBase {
  selectedBranch;
  branchList = [];
  storerList = [];
  itemGroupList = [];
  periodList = [];
  isFristLoaded = true;
  constructor(
    public pageProvider: CommonService,
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
      IDBranch: ['',Validators.required],
      IDStorer:[''],
      IDItemGroup: [''],
      IDItem: [''],
      IDPeriod: [''],
      IsShowInputOutputHasData:[''],
      FromDate: [this.getFormattedDate(new Date())],
      ToDate: [this.getFormattedDate(new Date())], 
    });
  }

  preLoadData(event) {
    Promise.all([ this.contactProvider.read({ IsStorer: true, Take: 20,
      Skip: 0, SkipAddress: true }),  this.postingPeriodProvider.read(),this.itemGroupProvider.read()]).then((values:any)=>{
      if(values[0] && values[0].data){
        this._storerDataSource.selected.push(...values[0].data);
      }
      if(values[1] && values[1].data){
        this.periodList =  values[1].data;
        let all = { Code: 'Khác', Id: 0 };
        this.periodList.unshift(all);
      }
      if(values[2] && values[2].data){
        lib.buildFlatTree(values[2].data, []).then((result: any) => {
          this.itemGroupList = result;
        });
      }
      this.branchList = lib.cloneObject(this.env.branchList);
      super.preLoadData(event);
    })
  }

  loadData(event) {
    this.loadedData(event);
    
  }

  loadedData(event) {
   
    super.loadedData(event);
    if (this.isFristLoaded) {
      this.isFristLoaded = false;
      this._storerDataSource.initSearch();
      this._IDItemDataSource.initSearch();
    }
  }
  getFormattedDate(date: Date): string {
    // Format the date as yyyy-MM-dd to match the input[type="date"] format
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
  changePeriod(){
    if (this.formGroup.get('IDPeriod').value) {
      let selectedPeriod = this.periodList.find(d=> d.Id ==this.formGroup.get('IDPeriod').value);
      this.formGroup.get('FromDate').setValue(selectedPeriod?.PostingDateFrom?.substring(0, 10));
      this.formGroup.get('ToDate').setValue(selectedPeriod?.PostingDateTo?.substring(0, 10));
    }
  }
  changeFilter() {
    this.formGroup.updateValueAndValidity();
    if(this.formGroup.get('FromDate').value> this.formGroup.get('ToDate').value){
      this.env.showMessage('From date cannot be lower than to date!', 'danger');
      return;
    }
    if(this.formGroup.invalid){
      return;
    }
    this.formGroup.markAsPristine();
    this.items = [];

    this.query = this.formGroup.getRawValue();
  
    this.pageConfig.isEndOfData = false;
    this.getInputOutputInventory();
  }

  getInputOutputInventory(event=null){
  let apiPath = {
      method: 'GET',
      url: function () {
        return ApiSetting.apiDomain('WMS/Transaction/InputOutputInventory/');
      },
    };
    if (this.pageProvider && !this.pageConfig.isEndOfData) {
      if (event == 'search') {
        this.env.showLoading('Please wait for a few moments', this.pageProvider
          .connect(apiPath.method, apiPath.url(), this.query)
          .toPromise())
          .then((result: any) => {
            if (result.length == 0 || result.length < this.query.Take) {
              this.pageConfig.isEndOfData = true;
            }
            this.items = result;
            this.loadedData(null);
          });
      } else {
        this.query.Skip = this.items.length;
        this.env.showLoading('Please wait for a few moments',  this.pageProvider
          .connect(apiPath.method, apiPath.url(), this.query)
          .toPromise())
          .then((result: any) => {
            if (result.length == 0 || result.length < this.query.Take) {
              this.pageConfig.isEndOfData = true;
            }
            if (result.length > 0) {
              this.items = [...this.items, ...result];
            }

            this.loadedData(event);
          });
      }
    } else {
      this.loadedData(event);
    }
  }

  // changePeriod() {
  //   if (this.selectedPeriod && this.selectedPeriod.Id != 0) {
  //     this.fromDate = this.selectedPeriod.PostingDateFrom.substring(0, 10);
  //     this.toDate = this.selectedPeriod.PostingDateTo.substring(0, 10);
  //   } else {
  //     this.fromDate = null;
  //     this.toDate = null;
  //   }
  // }

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

  _IDItemDataSource = 
    {
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
                  AllUoM:true,
                  IDItemGroup:this.that.formGroup.get('IDItemGroup').value?`[${ this.that.formGroup.get('IDItemGroup').value.join(',')}]`:'[]',
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
}
