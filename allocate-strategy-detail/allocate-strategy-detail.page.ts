import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, CRM_ContactProvider, HRM_StaffProvider, SYS_SchemaProvider, SYS_SyncJobProvider,WMS_AdjustmentDetailProvider,WMS_CycleCountProvider, WMS_ItemProvider, WMS_LocationProvider } from 'src/app/services/static/services.service';// WMS_AllocateStrategyDetailProvider, WMS_AllocateStrategyProvider, 
import { Location } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, RequiredValidator, Validators } from '@angular/forms';
import { Schema } from 'src/app/models/options-interface';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from 'src/app/services/core/common.service';
import { Subject, catchError, concat, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { lib } from 'src/app/services/static/global-functions';
import { WMS_Adjustment } from 'src/app/models/model-list-interface';
    //allocate-strategy

    /*allocate-strategy khai báo List rule
    Details Sẽ add những rule trên vào,
    Và khai báo đối tương áp ụng (Item,)
*/
@Component({
    selector: 'app-allocate-strategy-detail',
    templateUrl: 'allocate-strategy-detail.page.html',
    styleUrls: ['allocate-strategy-detail.page.scss']
})
export class AllocateStrategyDetailPage extends PageBase {
    countTypeDataSource: any;
    statusDataSource: any;
    arrangeDataSource: any;
    pickedRuleList:any;
    branchList
    ruleDataSource:any;
    constructor(
        //public pageProvider: WMS_Adjustment, //ToDo : Change provider
        public allocateRulesDetailService: WMS_AdjustmentDetailProvider,
        public storerService: CRM_ContactProvider,
        public locationService: WMS_LocationProvider,
        public itemService: WMS_ItemProvider,
        public commonService: CommonService,
        public branchProvider: BRA_BranchProvider,
        public route: ActivatedRoute,
        public modalController: ModalController,
        public formBuilder: FormBuilder,
        public cdr: ChangeDetectorRef,
        public popoverCtrl: PopoverController,
        public alertCtrl: AlertController,
        public loadingController: LoadingController,
        public env: EnvService,
        public navCtrl: NavController,
        public location: Location,
    ) {
        super();
        this.pageConfig.isDetailPage = true;
        this.pageConfig.canAdd = true;
        this.pageConfig.canDelete = true;
        this.pageConfig.canEdit = true;
        this.formGroup = this.formBuilder.group({
            Id: new FormControl({ value: '', disabled: true }),
            IDWarehouse: ['', Validators.required],
            Name :[''],
            AllocateRuleDetails: this.formBuilder.array([]),
            Remark: [''],
            Sort: [''],
            Rules : this.formBuilder.array([]),
            Status: ['', Validators.required],
            
            IsDisabled: new FormControl({ value: '', disabled: true }),
            IsDeleted: new FormControl({ value: '', disabled: true }),
            CreatedBy: new FormControl({ value: '', disabled: true }),
            CreatedDate: new FormControl({ value: '', disabled: true }),
            ModifiedBy: new FormControl({ value: '', disabled: true }),
            ModifiedDate: new FormControl({ value: '', disabled: true }),
        });
    }
    preLoadData(event) {
        this.arrangeDataSource = [
            { Name: 'Expired date', Code: 'ExpiredDate' },
            { Name: 'LCL', Code: 'LCL' }, //LCL - Less than Container Loaded - hàng lẻ
            { Name: 'FCL ', Code: 'FCL ' },//FCL (Full Container Load). Hàng FCL là những hàng đã đủ điều kiện xế
            { Name: 'Import date  ', Code: 'ImportDate' },
            { Name: 'Export Date ', Code: 'ExportDate' },
            { Name: 'Up to down', Code: 'UTD' },
            { Name: 'Down to up', Code: 'DTU' },
            { Name: 'Left to right', Code: 'LTR' },
            { Name: 'Right to left', Code: 'RTL' },

        ];
        super.preLoadData(event);
    }

    loadData(event?: any): void {
        this.item = {
            Id : 1,
            IDWarehouse : 1005,
            Status: 'Active',
        }
        this.loadedData();
    }
    loadedData(event?: any, ignoredFromGroup?: boolean): void {
        super.loadedData(event, ignoredFromGroup);
       // Rules : this.formBuilder.array([]);
        if(this.item.AllocateRuleDetails?.length>0){
            this.patchAllocateStrategyValue();
        }
        if(this.item.Rules?.length>0){
            this.patchRulesValue();
        }
        this.ruleDataSource = this.formGroup.get('Rules').value;

    }
    private patchRulesValue() {
        this.pageConfig.showSpinner = true;

        if (this.item.Rules?.length) {
            this.item.Rules.forEach(i => {
                this.addRule(i);
            })
        }
      
        if (!this.pageConfig.canEdit) {
            this.formGroup.controls.Rules.disable();
        }

        this.pageConfig.showSpinner = false;
    }
    private patchAllocateStrategyValue() {
        this.pageConfig.showSpinner = true;

        if (this.item.AllocateRuleDetails?.length) {
            this.item.AllocateRuleDetails.forEach(i => {
                this.addAllocateRuleDetail(i);
            })
        }
      
        if (!this.pageConfig.canEdit) {
            this.formGroup.controls.AllocateRuleDetails.disable();
        }

        this.pageConfig.showSpinner = false;
    }
    addRule(rule: any, fg = this.formGroup, markAsDirty = false) {
        let groups = <FormArray>fg.controls.Rules;
        let group = this.formBuilder.group({
            _ruleDataSource : [fg==this.formGroup?this.arrangeDataSource: this.ruleDataSource],
            IDRules : [rule?.Id],
            Name:[rule?.Name],
            Code:[rule?.Code],
            Sort:[rule?.Sort],
            Status:[rule?.Status],
            IsDisabled: new FormControl({ value: rule?.IsDisabled, disabled: true }),
            IsDeleted: new FormControl({ value: rule?.IsDeleted, disabled: true }),
            IsChecked: new FormControl({ value: false, disabled: false }),
        })
        groups.push(group);
    }


    addAllocateRuleDetail(rule: any, markAsDirty = false) {
        let groups = <FormArray>this.formGroup.controls.AllocateRuleDetails;
        let group = this.formBuilder.group({
            _ruleDataSource : [[...this.arrangeDataSource]],
            _itemDataSource: {
                searchProvider: this.itemService,
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
                        this.searchProvider.search({ Take: 20, Skip: 0, Term: term }).pipe(
                          catchError(() => of([])), // empty list on error
                          tap(() => (this.loading = false)),
                        ),
                      ),
                    ),
                  );
                },
              },
            _storerDataSource: {
                searchProvider: this.storerService,
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
                        this.searchProvider.search({ Take: 20, Skip: 0, Term: term }).pipe(
                          catchError(() => of([])), // empty list on error
                          tap(() => (this.loading = false)),
                        ),
                      ),
                    ),
                  );
                },
              },
            _locationDataSource: {
                searchProvider: this.locationService,
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
                        this.searchProvider.search({ Take: 20, Skip: 0, Term: term }).pipe(
                          catchError(() => of([])), // empty list on error
                          tap(() => (this.loading = false)),
                        ),
                      ),
                    ),
                  );
                },
              },

            Id:[rule?.Id],
            Name:[rule?.Name],
            IDAllocateStrategy:[this.formGroup.get('Id').value, Validators.required],
            Rules : this.formBuilder.array([]),
            IDItem:[rule?.IDItem],
            IDStorer:[rule?.IDStorer],
            IDZone:[rule?.IDZone],
            IDLocation:[rule?.IDLocation],
            Code:[rule?.Code],
            Sort:[rule?.Sort],
            Status:[rule?.Status],
            UoMName:[rule?.UoMName || 0],
            ItemName: [ rule?.ItemName], //de hien thi
            IsDisabled: new FormControl({ value: rule?.IsDisabled, disabled: true }),
            IsDeleted: new FormControl({ value: rule?.IsDeleted, disabled: true }),
            IsChecked: new FormControl({ value: false, disabled: false }),
        })
        groups.push(group);
        group.get('_locationDataSource').value.initSearch();
        group.get('_storerDataSource').value.initSearch();
        group.get('_itemDataSource').value.initSearch();

    }

    changeRule(){
      this.ruleDataSource = this.formGroup.get('Rules').value;
    }

    removeField(any){

    }
    doReorder(ev, groups, nameGroup) {
        groups = ev.detail.complete(groups);
        groups = groups.filter((f) => f.value.Type == nameGroup);
        for (let i = 0; i < groups.length; i++) {
          const g = groups[i];
          g.controls.Sort.setValue(i + 1);
          g.controls.Sort.markAsDirty();
        }
        this.saveChange();
      }
    async saveChange() {
        let submitItem = this.getDirtyValues(this.formGroup);
        super.saveChange2();
    }

    filterPickedRuleList(){
        let groups = <FormArray>this.formGroup.controls.AllocateRuleDetails;
        this.pickedRuleList = groups.controls.map(d=>d.get('Code').value);
        return this.arrangeDataSource.filter(d=> this.pickedRuleList.excludes(d.Code));
    }
    segmentView = 's1';
    segmentChanged(ev: any) {
        this.segmentView = ev.detail.value;
    }
}