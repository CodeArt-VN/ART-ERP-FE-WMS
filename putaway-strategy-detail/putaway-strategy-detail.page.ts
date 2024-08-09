import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import {
  BRA_BranchProvider,
  CRM_ContactProvider,
  HRM_StaffProvider,
  SYS_SchemaProvider,
  SYS_SyncJobProvider,
  WMS_AdjustmentDetailProvider,
  WMS_CycleCountProvider,
  WMS_ItemProvider,
  WMS_LocationProvider,
  WMS_PutawayStrategyProvider,
  WMS_ZoneProvider,
} from 'src/app/services/static/services.service'; // WMS_PutawayStrategyDetailProvider, WMS_PutawayStrategyProvider,
import { Location } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, RequiredValidator, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from 'src/app/services/core/common.service';
import { Subject, catchError, concat, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { WMS_PutawayStrategy } from 'src/app/models/model-list-interface';
import { lib } from 'src/app/services/static/global-functions';

//putaway-strategy

/*putaway-strategy khai báo List rule
    Details Sẽ add những rule trên vào,
    Và khai báo đối tương áp ụng (Item,)
*/
@Component({
  selector: 'app-putaway-strategy-detail',
  templateUrl: 'putaway-strategy-detail.page.html',
  styleUrls: ['putaway-strategy-detail.page.scss'],
})
export class PutawayStrategyDetailPage extends PageBase {
  countTypeDataSource: any;
  statusDataSource: any;
  arrangeDataSource: any;
  locationSortTypeDataSource: any;
  typeDataSource: any;
  pickedRuleList: any;
  branchList;
  openedFields: any = [];
  ruleDataSource: any;
  constructor(
    public pageProvider: WMS_PutawayStrategyProvider,
    public putawayRulesDetailService: WMS_AdjustmentDetailProvider,
    public storerService: CRM_ContactProvider,
    public locationService: WMS_LocationProvider,
    public zoneService: WMS_ZoneProvider,
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

    this.formGroup = this.formBuilder.group({
      Id: new FormControl({ value: '', disabled: true }),
      IDBranch: ['', Validators.required],
      Name: ['', Validators.required],
      Code: ['', Validators.required],
      PutawayStrategyDetails: this.formBuilder.array([]),
      Remark: [''],
      Sort: [''],
      _TrackingIDBranch: [''],
      DeletedFields: [[]],
      IsDisabled: new FormControl({ value: '', disabled: true }),
      IsDeleted: new FormControl({ value: '', disabled: true }),
      CreatedBy: new FormControl({ value: '', disabled: true }),
      CreatedDate: new FormControl({ value: '', disabled: true }),
      ModifiedBy: new FormControl({ value: '', disabled: true }),
      ModifiedDate: new FormControl({ value: '', disabled: true }),
    });
  }

  //#region Load
  preLoadData(event) {
    // this.arrangeDataSource = [
    //   { Name: 'Expired date', Code: 'ExpiredDate' },
    //   { Name: 'LCL', Code: 'LCL' }, //LCL - Less than Container Loaded - hàng lẻ
    //   { Name: 'FCL ', Code: 'FCL ' }, //FCL (Full Container Load). Hàng FCL là những hàng đã đủ điều kiện xế
    //   { Name: 'Import date  ', Code: 'ImportDate' },
    //   { Name: 'Export Date ', Code: 'ExportDate' },
    //   { Name: 'Up to down', Code: 'UTD' },
    //   { Name: 'Down to up', Code: 'DTU' },
    //   { Name: 'Left to right', Code: 'LTR' },
    //   { Name: 'Right to left', Code: 'RTL' },
    // ];
    this.locationSortTypeDataSource = [
      { Name: 'Name', Code: 'Name' },
      { Name: 'RouteSequence', Code: 'RouteSequence' },
    ];
    this.typeDataSource = [
      { Name: 'Find an open location in zone', Code: 'findAnOpenLocationInZone' },
      { Name: 'Find all open location in zone', Code: 'findAllOpenLocationsInZone' },
      { Name: 'Find an open location in default zone', Code: 'findAnOpenLocationInDefaultZone' },
      { Name: 'Find locations with space in default zone', Code: 'findLocationsWithSpaceInDefaultZone' },
    ];
    this.branchProvider
      .read({ Skip: 0, Take: 5000, Type: 'Warehouse', AllParent: true, Id: this.env.selectedBranchAndChildren })
      .then((resp) => {
        lib.buildFlatTree(resp['data'], this.branchList).then((result: any) => {
          this.branchList = result;
          this.branchList.forEach((i) => {
            i.disabled = true;
          });
          this.markNestedNode(this.branchList, this.env.selectedBranch);
        });
      });
    super.preLoadData(event);
  }

  loadedData(event?: any, ignoredFromGroup?: boolean): void {
    super.loadedData(event, ignoredFromGroup);
    // Rules : this.formBuilder.array([]);
    if (this.item.PutawayStrategyDetails?.length > 0) {
      this.item.PutawayStrategyDetails = this.item.PutawayStrategyDetails?.sort((a, b) => a.Sort - b.Sort);
      let groups = this.formGroup.get('PutawayStrategyDetails') as FormArray;
      groups.clear();
      this.patchPutawayStrategyValue();
    }
    this.formGroup.get('_TrackingIDBranch').setValue(this.item?.IDBranch);
    // super.preLoadData(event);
  }

  private patchPutawayStrategyValue() {
    this.pageConfig.showSpinner = true;

    if (this.item.PutawayStrategyDetails?.length) {
      this.item.PutawayStrategyDetails.forEach((i) => {
        this.addPutawayRuleDetail(i);
      });
    }

    if (!this.pageConfig.canEdit) {
      this.formGroup.controls.PutawayStrategyDetails.disable();
    }

    this.pageConfig.showSpinner = false;
  }

  addPutawayRuleDetail(rule: any, markAsDirty = false) {
    let groups = <FormArray>this.formGroup.controls.PutawayStrategyDetails;
    if (markAsDirty == true && groups.controls.some((d) => d.get('Id').value == null)) return;
    let group = this.formBuilder.group({
      _fromLocationDataSource: {
        loading: false,
        page: this,
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
                this.page.locationService
                  .search({ Take: 20, Skip: 0, Term: term, IDBranch: this.page.formGroup.get('IDBranch').value })
                  .pipe(
                    catchError(() => of([])), // empty list on error
                    tap(() => (this.loading = false)),
                  ),
              ),
            ),
          );
        },
      },
      _toLocationDataSource: {
        loading: false,
        page: this,
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
                this.page.locationService
                  .search({ Take: 20, Skip: 0, Term: term, IDBranch: this.page.formGroup.get('IDBranch').value })
                  .pipe(
                    catchError(() => of([])), // empty list on error
                    tap(() => (this.loading = false)),
                  ),
              ),
            ),
          );
        },
      },
      _fromZoneDataSource: {
        page: this,
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
                this.page.zoneService
                  .search({ Take: 20, Skip: 0, Term: term, IDBranch: this.page.formGroup.get('IDBranch').value })
                  .pipe(
                    catchError(() => of([])), // empty list on error
                    tap(() => (this.loading = false)),
                  ),
              ),
            ),
          );
        },
      },
      _toZoneDataSource: {
        page: this,
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
                this.page.zoneService
                  .search({ Take: 20, Skip: 0, Term: term, IDBranch: this.page.formGroup.get('IDBranch').value })
                  .pipe(
                    catchError(() => of([])), // empty list on error
                    tap(() => (this.loading = false)),
                  ),
              ),
            ),
          );
        },
      },
      Id: [rule?.Id],
      Name: [rule?.Name, Validators.required],
      IDPutawayStrategy: [this.formGroup.get('Id').value, Validators.required],
      Type: [rule?.Type || 'Test', Validators.required],

      FromZone: [rule?.FromZone],
      FromZoneName: [rule?.FromZoneName],
      ToZone: [rule?.ToZone],
      ToZoneName: [rule?.ToZoneName],

      FromLocation: [rule?.FromLocation],
      FromLocationName: [rule?.FromLocationName],
      ToLocation: [rule?.ToLocation],
      ToLocationName: [rule?.ToLocationName],

      IsSinglePutawayForMultiplePallets: [rule?.IsSinglePutawayForMultiplePallets],
      IsChecksRestrictions: [rule?.IsChecksRestrictions],
      DimensionRestriction: [rule?.DimensionRestriction, Validators.required],
      LocationSortType: [rule?.LocationSortType],
      AreaTypeRestrictions: [rule?.AreaTypeRestrictions],
      Code: [rule?.Code],
      Sort: [rule?.Sort],
      Status: [rule?.Status],

      IsDisabled: new FormControl({ value: rule?.IsDisabled, disabled: true }),
      IsDeleted: new FormControl({ value: rule?.IsDeleted, disabled: true }),
      IsChecked: new FormControl({ value: false, disabled: false }),
    });
    groups.push(group);
    group.get('_fromLocationDataSource').value
    if(rule.FromLocation){
      let fromLocation = {Name:rule.FromLocationName,Id : rule.FromLocation};
      group.get('_fromLocationDataSource').value.selected = [fromLocation];
    }
    if(rule.ToLocation){
      let toLocation = {Name:rule.ToLocationName,Id : rule.ToLocation};
      group.get('_toLocationDataSource').value.selected = [toLocation];
    }
    if(rule.FromZone){
      let fromZone = {Name:rule.FromZoneName,Id : rule.FromZone};
      group.get('_fromZoneDataSource').value.selected = [fromZone];
    }
    if(rule.ToZone){ 
      let toZone = {Name:rule.ToZoneName,Id : rule.ToZone};
      group.get('_toZoneDataSource').value.selected = [toZone];
    }
    group.get('_fromLocationDataSource').value.initSearch();
    group.get('_toLocationDataSource').value.initSearch();
    group.get('_fromZoneDataSource').value.initSearch();
    group.get('_toZoneDataSource').value.initSearch();
    if (markAsDirty) group.get('Type').markAsDirty();
  }
  //#endregion

  //#region Bussiness logic
  IDBranchChange(){
    let groups = <FormArray>this.formGroup.controls.PutawayStrategyDetails;
    if(groups.controls.length>0 && (groups.controls.some(g=>g.get('FromZone').value || g.get('ToZone').value || g.get('FromLocation').value || g.get('ToLocation').value))){
      this.env
      .showPrompt2('Bạn có muốn tiếp tục?', null, 'Thay đổi kho sẽ mất hết dữ liệu zone và location của rule!')
      .then((_) => {
       
        groups.controls.forEach(fg=>{
          fg.get('FromZone').setValue(null);
          fg.get('FromZoneName').setValue('');
          fg.get('ToZone').setValue(null);
          fg.get('ToZoneName').setValue('');
          fg.get('FromLocation').setValue(null);
          fg.get('FromLocationName').setValue('');
          fg.get('ToLocation').setValue(null);
          fg.get('ToLocationName').setValue('');

          fg.get('FromZone').markAsDirty();
          fg.get('ToZone').markAsDirty();
          fg.get('FromLocation').markAsDirty();
          fg.get('ToLocation').markAsDirty();

          fg.get('_fromLocationDataSource').value.items$ = null;
          fg.get('_toLocationDataSource').value.items$ = null;
          fg.get('_fromZoneDataSource').value.items$ = null;
          fg.get('_fromZoneDataSource').value.items$ = null;

          fg.get('_fromLocationDataSource').value.initSearch();
          fg.get('_toLocationDataSource').value.initSearch();
          fg.get('_fromZoneDataSource').value.initSearch();
          fg.get('_toZoneDataSource').value.initSearch();
        })

        this.formGroup.get('_TrackingIDBranch').setValue( this.formGroup.get('IDBranch').value)
        this.saveChange();
      }).catch(err=>{
        this.formGroup.get('IDBranch').setValue(this.formGroup.get('_TrackingIDBranch').value);
        this.formGroup.get('IDBranch').markAsPristine();
      })
    }
      else {
        this.formGroup.get('_TrackingIDBranch').setValue( this.formGroup.get('IDBranch').value)
        this.saveChange();
      }
   
  }

  removeField(g, index) {
    this.env
      .showPrompt2('Bạn có chắc muốn xóa không?', null, 'Xóa 1 dòng')
      .then((_) => {
        let groups = <FormArray>this.formGroup.controls.PutawayStrategyDetails;
        //groups.controls[index].get('IsDeleted').setValue(true);
        groups.removeAt(index);
        this.item.PutawayStrategyDetails.splice(index, 1);
        let deletedFields = this.formGroup.get('DeletedFields').value;
        let deletedId = g.controls.Id.value;
        deletedFields.push(deletedId);

        this.formGroup.get('DeletedFields').setValue(deletedFields);
        this.formGroup.get('DeletedFields').markAsDirty();
        //  groups.controls[index].markAsDirty();
        // groups.controls[index].get('IsDeleted').markAsDirty()
        this.saveChange();
      })
      .catch((_) => {});
  }

  doReorder(ev, groups) {
    let obj = [];
    groups = ev.detail.complete(groups);
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      g.controls.Sort.setValue(i + 1);
      g.controls.Sort.markAsDirty();
    }
    this.saveChange();
  }

  //#endregion

  //#region  SaveChange

  async saveChange() {
    let submitItem = this.getDirtyValues(this.formGroup);
    super.saveChange2();
  }

  savedChange(savedItem = null, form = this.formGroup) {
    super.savedChange(savedItem);
    let groups = this.formGroup.get('PutawayStrategyDetails') as FormArray;
    let idsBeforeSaving = new Set(groups.controls.map((g) => g.get('Id').value));
    this.item = savedItem;

    if (this.item.PutawayStrategyDetails?.length > 0) {
      let newIds = new Set(this.item.PutawayStrategyDetails.map((i) => i.Id));
      const diff = [...newIds].filter((item) => !idsBeforeSaving.has(item));
      if (diff?.length > 0) {
        groups.controls .find((d) => d.get('Id').value == null) ?.get('Id') .setValue(diff[0]);
        this.openedFields = [...this.openedFields, diff[0].toString()];
    console.log(this.openedFields);

      }
    }
  }

  //#endregion

  //#region  According
  accordionGroupChange(e) {
    this.openedFields = e.detail.value;
    console.log(this.openedFields);
  }

  isAccordionExpanded(id: string): boolean {
    return this.openedFields.includes(id?.toString());
  }

  //#endregion

  //#region Segment
  segmentView = 's1';
  segmentChanged(ev: any) {
    this.segmentView = ev.detail.value;
  }
  //#endregion

  markNestedNode(ls, Id) {
    ls.filter((d) => d.IDParent == Id).forEach((i) => {
      if (i.Type == 'Warehouse') i.disabled = false;
      this.markNestedNode(ls, i.Id);
    });
  }
}
