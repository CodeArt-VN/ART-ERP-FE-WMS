import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController, LoadingController, NavController, PopoverController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { EnvService } from 'src/app/services/core/env.service';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { NgSelectConfig } from '@ng-select/ng-select';
import {
  WMS_ItemGroupProvider,
  FINANCE_GeneralLedgerProvider,
  WMS_ItemGroupAccountInBranchProvider,
} from 'src/app/services/static/services.service';
import { lib } from 'src/app/services/static/global-functions';

@Component({
  selector: 'app-item-group-detail',
  templateUrl: 'item-group-detail.page.html',
  styleUrls: ['item-group-detail.page.scss'],
})
export class ItemGroupDetailPage extends PageBase {
  branchList = [];
  selectedBranch = null;
  optionGroup = [
    {
      Code: 'GeneralInformation',
      Name: 'General information',
    },
    {
      Code: 'Accounts',
      Name: 'Accounts',
    }
  ];
  ChartOfAccount = [];
  segmentView = {
    Page: 'GeneralInformation',
    ShowSpinner: true,
  };
  branchSelected = false;
  selectedOption = null;

  constructor(
    public pageProvider: WMS_ItemGroupProvider,
    public itemGroupAccountInBranchProvider: WMS_ItemGroupAccountInBranchProvider,
    public chartOfAccountProvider: FINANCE_GeneralLedgerProvider,
    public popoverCtrl: PopoverController,
    public env: EnvService,
    public route: ActivatedRoute,
    public alertCtrl: AlertController,
    public navCtrl: NavController,
    public formBuilder: FormBuilder,
    public cdr: ChangeDetectorRef,
    public loadingController: LoadingController,
    private config: NgSelectConfig,
  ) {
    super();
    this.item = {};
    this.pageConfig.isDetailPage = true;
    this.pageConfig.isShowFeature = true;
    this.pageConfig.isFeatureAsMain = true;
    this.id = this.route.snapshot.paramMap.get('id');
    this.formGroup = formBuilder.group({
      IDBranch: new FormControl({ value: null, disabled: false }),
      Id: new FormControl({ value: '0', disabled: true }),
      Code: ['', Validators.required],
      Name: ['', Validators.required],
      Remark: new FormControl(),
      Sort: [''],
      IDItemGroup: [],
      Account: [''],
      AccountInventory: [''],
      AccountCostOfGoodsSold: [''],
      AccountPriceDifference: [''],
      IsDisabled: new FormControl({ value: '', disabled: true }),
      CreatedBy: new FormControl({ value: '', disabled: true }),
      CreatedDate: new FormControl({ value: '', disabled: true }),
      ModifiedBy: new FormControl({ value: '', disabled: true }),
      ModifiedDate: new FormControl({ value: '', disabled: true }),
      
    });
  }

  preLoadData(event) {
    Promise.all([ this.env.branchList.filter((d) => d.Type == 'Company'),
      this.chartOfAccountProvider.commonService
        .connect('GET', 'FINANCE/GeneralLedger/', {
          Keyword: '',
          Take: 5000,
          AllChildren: true,
          AllParent: true,
        })
        .toPromise()
    ]).then((values: any) => {
      if (values[0]) {
        this.branchList = values[0];
      }
      if (values[1]) {
        lib.buildFlatTree(values[1], []).then((result: any) => {
          this.ChartOfAccount = result;
         
        });
      }
      super.preLoadData();
    });
    setTimeout(() => {
      this.loadNode();
    }, 0);
  }

  loadedData() {
    super.loadedData(null);
    if (this.pageConfig.canEdit || this.pageConfig.canAdd) {
      this.formGroup.get('Account').enable();
      this.formGroup.get('AccountInventory').enable();
      this.formGroup.get('AccountCostOfGoodsSold').enable();
      this.formGroup.get('AccountPriceDifference').enable();
    } else {
      this.formGroup.get('Account').disable();
      this.formGroup.get('AccountInventory').disable();
      this.formGroup.get('AccountCostOfGoodsSold').disable();
      this.formGroup.get('AccountPriceDifference').disable();
    }
  }

  refresh() {
    this.loadItemGroupAccountInBranch();
  }

  selectBranch() {
    this.loadItemGroupAccountInBranch();
    if (!this.selectedBranch) {
      this.loadNode(this.optionGroup[0]);
    }else {
      this.loadNode();
    }
    if (this.pageConfig.canEdit || this.pageConfig.canAdd) {
      this.formGroup.get('Account').enable();
      this.formGroup.get('AccountInventory').enable();
      this.formGroup.get('AccountCostOfGoodsSold').enable();
      this.formGroup.get('AccountPriceDifference').enable();
    } else {
      this.formGroup.get('Account').disable();
      this.formGroup.get('AccountInventory').disable();
      this.formGroup.get('AccountCostOfGoodsSold').disable();
      this.formGroup.get('AccountPriceDifference').disable();
    }
  }

  loadItemGroupAccountInBranch() {
    if (this.selectedBranch) {
      let query = {
        IDItemGroup: this.id,
        IDBranch: this.selectedBranch.Id,
      };
      this.formGroup.controls.IDBranch.markAsDirty();
      this.env
        .showLoading2(
          'Please wait a moment!',
          this.pageProvider.commonService
            .connect('GET', 'WMS/ItemGroupAccountInBranch/', query)
            .toPromise()
            .then((data: any) => {
              if (data.length > 0) {
                const originalId = this.item.Id;
                const originalCode = this.item.Code;
                const originalName = this.item.Name;
                const originalSort = this.item.Sort;
                this.item = { ...data[0], 
                  Id: originalId,
                  Code: originalCode,
                  Name: originalName,
                  Sort: originalSort,
                };
                this.item.IDItemGroupAccountInBranch = data[0].Id;
                this.item.Id = data[0].IDItemGroup;
                this.formGroup?.patchValue(this.item);
                this.formGroup?.markAsPristine();
                this.cdr.detectChanges();
              } else {
                this.item.IDItemGroupAccountInBranch = 0;
                this.resetItemGroupInBranch();
              }
            }),
        )
        .catch((error) => {
          this.segmentView.ShowSpinner = false;
        });
      this.branchSelected = true;
    } else {
      this.resetItemGroupInBranch();
      this.branchSelected = false;
      this.pageProvider
        .getAnItem(this.id, null)
        .then((ite) => {
          this.item = ite;
          this.formGroup?.patchValue(this.item);
          this.formGroup?.markAsPristine();
          this.cdr?.detectChanges();
        })
        .catch((err) => {
          console.log(err);

          if ((err.status = 404)) {
            this.nav('not-found', 'back');
          } else {
            this.item = null;
          }
        });
    }
  }

  resetItemGroupInBranch() {
    this.formGroup.patchValue({
      IDItemGroupAccountInBranch: 0,
      Account: '',
      AccountInventory: '',
      InventoryLevelMaximum: '',
      AccountCostOfGoodsSold: '',
      AccountPriceDifference: '',
    });
  }



  loadNode(option = null) {
    this.pageConfig.isSubActive = true;
    if (!option && this.segmentView) {
      option = this.optionGroup.find((d) => d.Code == this.segmentView.Page);
    }

    if (!option) {
      option = this.optionGroup[0];
    }

    if (!option) {
      return;
    }
    this.selectedOption = option;
    this.segmentView.Page = option.Code;
  }

  async saveItemGroupInBranch() {
    if (this.selectedBranch) {
      return new Promise((resolve, reject) => {
        this.formGroup.updateValueAndValidity();
        if (!this.formGroup.valid) {
          this.env.showTranslateMessage('Please recheck information highlighted in red above', 'warning');
        } else if (this.submitAttempt == false) {
          const idItemGroupAccountInBranch = this.item.IDItemGroupAccountInBranch || 0;
          this.formGroup.get('Id').setValue(idItemGroupAccountInBranch);
          this.formGroup.get('IDItemGroup').setValue(this.id);
          this.formGroup.get('IDBranch').setValue(this.selectedBranch.Id);
          this.formGroup.controls.IDBranch.markAsDirty();
          this.formGroup.controls.Id.markAsDirty();
          this.formGroup.controls.IDItemGroup.markAsDirty();
          this.submitAttempt = true;
          let submitItem = this.getDirtyValues(this.formGroup);

          this.itemGroupAccountInBranchProvider
            .save(submitItem, this.pageConfig.isForceCreate)
            .then((savedItem: any) => {
              resolve(savedItem);

              if (savedItem) {
                this.item.IDItemGroupAccountInBranch = savedItem.Id;
              }
              this.savedChange(savedItem, this.formGroup);
              if (this.pageConfig.pageName) this.env.publishEvent({ Code: this.pageConfig.pageName });

              this.formGroup.get('Id').setValue(this.id);
            })
            .catch((err) => {
              this.env.showTranslateMessage('Cannot save, please try again', 'danger');
              this.cdr.detectChanges();
              this.submitAttempt = false;
              reject(err);
            });
        }
      });
    }
  }

  async saveChange() {
    this.formGroup.get('Id').setValue(this.id);
    this.formGroup.controls.Id.markAsDirty();
    this.saveChange2();
  }
}
