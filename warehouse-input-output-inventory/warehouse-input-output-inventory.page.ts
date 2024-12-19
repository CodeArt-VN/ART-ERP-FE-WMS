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
  periodList = [];
  isFristLoaded = true;
  constructor(
    public pageProvider: CommonService,
    public env: EnvService,
    public route: ActivatedRoute,
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

    this.postingPeriodProvider.read().then((resp) => {
      this.periodList = resp['data'];
      let all = { Code: 'Khác', Id: 0 };
      this.periodList.unshift(all);
    });
  }

  loadData(event) {
    let apiPath = {
      method: 'GET',
      url: function () {
        return ApiSetting.apiDomain('WMS/Transaction/InputOutputInventory/');
      },
    };
    if (this.pageProvider && !this.pageConfig.isEndOfData) {
      if (event == 'search') {
        this.pageProvider
          .connect(apiPath.method, apiPath.url(), this.query)
          .toPromise()
          .then((result: any) => {
            if (result.length == 0 || result.length < this.query.Take) {
              this.pageConfig.isEndOfData = true;
            }
            this.items = result;
            this.loadedData(null);
          });
      } else {
        this.query.Skip = this.items.length;
        this.pageProvider
          .connect(apiPath.method, apiPath.url(), this.query)
          .toPromise()
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

  loadedData(event) {
    this.items.forEach((i) => {
      i.OpenQuantity = lib.formatMoney(i.OpenQuantity, 0);
      i.OpenCube = lib.formatMoney(i.OpenCube / 1000000, 3);
      i.OpenGrossWeight = lib.formatMoney(i.OpenGrossWeight / 1000, 3);
      i.OpenNetWeight = lib.formatMoney(i.OpenNetWeight / 1000, 3);

      i.InputQuantity = lib.formatMoney(i.InputQuantity, 0);
      i.InputCube = lib.formatMoney(i.InputCube / 1000000, 3);
      i.InputGrossWeight = lib.formatMoney(i.InputGrossWeight / 1000, 3);
      i.InputNetWeight = lib.formatMoney(i.InputNetWeight / 1000, 3);

      i.OutputQuantity = lib.formatMoney(i.OutputQuantity, 0);
      i.OutputCube = lib.formatMoney(i.OutputCube / 1000000, 3);
      i.OutputGrossWeight = lib.formatMoney(i.OutputGrossWeight / 1000, 3);
      i.OutputNetWeight = lib.formatMoney(i.OutputNetWeight / 1000, 3);

      i.CloseQuantity = lib.formatMoney(i.CloseQuantity, 0);
      i.CloseCube = lib.formatMoney(i.CloseCube / 1000000, 3);
      i.CloseGrossWeight = lib.formatMoney(i.CloseGrossWeight / 1000, 3);
      i.CloseNetWeight = lib.formatMoney(i.CloseNetWeight / 1000, 3);
    });
    super.loadedData(event);
    if (this.isFristLoaded) {
      this.isFristLoaded = false;
      this.itemSearch();
    }
  }

  selectedStorer = null;
  selectedItem = null;
  selectedPeriod = null;
  fromDate = null;
  toDate = null;
  changeFiler() {
    this.items = [];

    if (this.selectedPeriod && this.selectedPeriod.Id != 0) {
      this.fromDate = this.selectedPeriod.PostingDateFrom.substring(0, 10);
      this.toDate = this.selectedPeriod.PostingDateTo.substring(0, 10);
    } else {
      this.fromDate = null;
      this.toDate = null;
    }
    this.query.IDBranch = this.selectedBranch?.Id;
    this.query.IDStorer = this.selectedStorer?.Id;
    this.query.IDItem = this.selectedItem?.Id;
    this.query.IDPeriod = this.selectedPeriod?.Id;
    if (this.fromDate) this.query.CreatedDateFrom = this.fromDate;
    if (this.toDate) this.query.CreatedDateTo = this.toDate;

    if (this.selectedBranch) {
      this.pageConfig.isEndOfData = false;
      this.loadData(null);
    }
  }

  changePeriod() {
    if (this.selectedPeriod && this.selectedPeriod.Id != 0) {
      this.fromDate = this.selectedPeriod.PostingDateFrom.substring(0, 10);
      this.toDate = this.selectedPeriod.PostingDateTo.substring(0, 10);
    } else {
      this.fromDate = null;
      this.toDate = null;
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
