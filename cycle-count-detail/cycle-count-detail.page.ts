import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, HRM_StaffProvider, SYS_SchemaProvider, WMS_CycleCountDetailProvider, WMS_CycleCountProvider, WMS_ItemProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, RequiredValidator, Validators } from '@angular/forms';
import { Schema } from 'src/app/models/options-interface';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { ActivatedRoute } from '@angular/router';
import { CommonService } from 'src/app/services/core/common.service';
import { Subject, catchError, concat, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { lib } from 'src/app/services/static/global-functions';

@Component({
    selector: 'app-cycle-count-detail',
    templateUrl: 'cycle-count-detail.page.html',
    styleUrls: ['cycle-count-detail.page.scss']
})
export class CycleCountDetailPage extends PageBase {
    countTypeDataSource: any;
    statusDataSource: any;
    schema: Schema;
    config: any = null;
    itemList: any;
    tempItemList: any;
    countItem: number = 0;
    branchList
    constructor(
        public pageProvider: WMS_CycleCountProvider,
        public cycleCountDetailService: WMS_CycleCountDetailProvider,
        public staffService: HRM_StaffProvider,
        public schemaService: SYS_SchemaProvider,
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
        this.pageConfig.canEdit = true;
        this.pageConfig.canAdd = true;
        this.pageConfig.canDelete = true;
        this.pageConfig.canImport = true;
        this.formGroup = this.formBuilder.group({
            Id: new FormControl({ value: '', disabled: true }),
            IDBranch: ['', Validators.required],
            Code: [''],
            Name: [''],
            Remark: [''],
            Sort: [''],
            CountType: [''],
            CountDate: [''],
            IsShowSysQty: [false],
            Status: ['', Validators.required],
            Counters: [''],
            _Counters: [''],
            IsPrintAllCounterPerSheet: [false],
            CycleCountDetails: this.formBuilder.array([]),
            IsDisabled: new FormControl({ value: '', disabled: true }),
            IsDeleted: new FormControl({ value: '', disabled: true }),
            CreatedBy: new FormControl({ value: '', disabled: true }),
            CreatedDate: new FormControl({ value: '', disabled: true }),
            ModifiedBy: new FormControl({ value: '', disabled: true }),
            ModifiedDate: new FormControl({ value: '', disabled: true }),
            DeletedFields: [[]],
        });
    }

    preLoadData(event) {
        this.countTypeDataSource = [
            { Name: 'Single', Code: 'Single' },
            { Name: 'Validation', Code: 'Validation' },
        ];
        this.statusDataSource = [
            { Name: 'Open', Code: 'Open' },
            { Name: 'Close', Code: 'Close' },
        ];
        this.schemaService.getAnItem(5)
            .then((value: any) => {
                if (value)
                    this.schema = value;
            });
            this.branchProvider.read({ Skip: 0, Take: 5000, Type: 'Warehouse', AllParent: true, Id: this.env.selectedBranchAndChildren }).then(resp => {
                lib.buildFlatTree(resp['data'], this.branchList).then((result: any) => {
                    this.branchList = result;
                    this.branchList.forEach(i => {
                        i.disabled = true;
                    });
                    this.markNestedNode(this.branchList, this.env.selectedBranch);
                    super.preLoadData(event);
                }).catch(err => {
                    this.env.showMessage(err);
                    console.log(err);
                });
            });
        super.preLoadData(event);
    }

    loadedData(event?: any, ignoredFromGroup?: boolean): void {
        super.loadedData(event, ignoredFromGroup);

        this.patchFieldsValue();
        this._itemDataSource.initSearch();

        if(this.item.Counters){
            var counters = JSON.parse(this.item.Counters);
            if(counters){
                this.formGroup.get('_Counters').setValue(counters.map(d=>d.Id));
            }
          this._staffDataSource.selected = counters;
        }
        this._staffDataSource.initSearch();

        //  this.patchFormValue();
    }
    private patchFieldsValue() {
        this.pageConfig.showSpinner = true;
        this.formGroup.controls.CycleCountDetails = new FormArray([]);
        if (this.item.CycleCountDetails?.length) {
            this.item.CycleCountDetails.forEach(i => this.addField(i));
        }

        if (!this.pageConfig.canEdit) {
            this.formGroup.controls.CycleCountDetails.disable();
        }
        this.pageConfig.showSpinner = false;
    }

    addField(field: any, markAsDirty = false) {
        let groups = <FormArray>this.formGroup.controls.CycleCountDetails;
        let group = this.formBuilder.group({
            IDCycleCount: [this.item.Id],
            Id: new FormControl({ value: field.Id, disabled: true }),
            IDItem: new FormControl({ value: field.IDItem, disabled: true }),
            IDUoM: new FormControl({ value: field.IDUoM, disabled: true }),
            Code: [field.Code],
            Name: [field.Name],
            Remark: [field.Remark],
            Sort: [field.Sort],
            CurrentQuantity: [field.CurrentQuantity],
            IsCounted: [field.IsCounted],
            CountedQuantity: [field.CountedQuantity],
            Zone: [field.Zone],
            Row: [field.Row],
            Level: [field.Level],
            Location: [field.Location],
            UoMName: new FormControl({ value: field.UoMName, disabled: true }), //de hien thi
            ItemName: new FormControl({ value: field.ItemName, disabled: true }), //de hien thi
            IsDisabled: new FormControl({ value: field.IsDisabled, disabled: true }),
            IsDeleted: new FormControl({ value: field.IsDeleted, disabled: true }),
            CreatedBy: new FormControl({ value: field.CreatedBy, disabled: true }),
            CreatedDate: new FormControl({ value: field.CreatedDate, disabled: true }),
            ModifiedBy: new FormControl({ value: field.ModifiedBy, disabled: true }),
            ModifiedDate: new FormControl({ value: field.ModifiedDate, disabled: true }),
            IsChecked: new FormControl({ value: false, disabled: false }),
        })
        groups.push(group);
    }

    filterConfig(e) {
        let obj = {
            'config': JSON.stringify(e)
        }

        let apiPath = { method: "POST", url: function () { return ApiSetting.apiDomain("WMS/Item/Filter") } };
        this.env.showLoading('Vui lòng chờ load dữ liệu...', this.itemService.commonService.connect(apiPath.method, apiPath.url(), obj).toPromise())

            .then((data: any) => {
                if (data.length) {
                    this.tempItemList = data;
                    this.countItem = data.length
                    this.loadedData();
                }
            })
    }

    applyFilter() {
        if (this.formGroup.get('Id').value == 0) {
            this.env.showMessage('Vui lòng khởi tạo phiếu kiểm trước', 'danger');
            return;
        }
        if (this.tempItemList) {
            this.saveFields(this.tempItemList);
        }
        this.isModalAddRangesOpen = false;
    }

    saveFields(ids) {
        let cycleCountDetails = this.formGroup.getRawValue().CycleCountDetails;
        if (cycleCountDetails) {
            ids = ids.filter(d => !cycleCountDetails.map(m => m.IDItem).includes(d));
        }
        if (ids.length>0) {
            let apiPath = {
                method: "POST",
                url: function () { return ApiSetting.apiDomain("WMS/CycleCount/PostListDetail") }
            }
            // loại CycleCountDetail đã tồn tại
            let obj: any = {
                id: this.formGroup.get('Id').value,
                IdItems: ids,
            }
            this.env.showLoading('Vui lòng chờ load dữ liệu...', this.itemService.commonService.connect(apiPath.method, apiPath.url(), obj).toPromise())
            .then((result: any) => {
                if (result && result.length > 0) {
                    if (this.item.CycleCountDetails) this.item.CycleCountDetails.concat(result);
                    else this.item.CycleCountDetails = result;
                    result.forEach(i => this.addField(i))
                }

            })
        }

    }

    saveChangeDetail(fg : FormGroup){
        this.saveChange2(fg,null,this.cycleCountDetailService)
    }

    changeCounters(e){
        this.formGroup.get('Counters').setValue(JSON.stringify(e));
        this.formGroup.get('Counters').markAsDirty();
        this.saveChange();
    }

    changeWarehouse(ev) {
        this.formGroup.get('IDBranch').setValue(ev.Id);
        this.formGroup.get('IDBranch').markAsDirty();
        this.saveChange();
    }

    isModalAddFieldOpen = false;

    isModalAddRangesOpen = false;

    field: FormGroup;

    _staffDataSource = {
        searchProvider: this.staffService,
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
                    tap(() => this.loading = true),
                    switchMap(term => this.searchProvider.search({ Take: 20, Skip: 0, Term: term }).pipe(
                        catchError(() => of([])), // empty list on error
                        tap(() => this.loading = false)
                    ))

                )
            );
        }
    };


    _itemDataSource = {
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
                    tap(() => this.loading = true),
                    switchMap(term => this.searchProvider.search({ Take: 20, Skip: 0, Term: term }).pipe(
                        catchError(() => of([])), // empty list on error
                        tap(() => this.loading = false)
                    ))

                )
            );
        }
    }

    presentModal(modal) {
        if (modal == 'addRanges') {
            this.isModalAddRangesOpen = true;
            this.isModalAddFieldOpen = false;
        }
        if (modal == 'addField') {
            this.field = this.formBuilder.group({
                IDCycleCount: [this.item.Id],
                Id: new FormControl({ value: '', disabled: true }),
                IDItem: new FormControl({ value: '', disabled: false }),
                IDUoM: new FormControl({ value: '', disabled: true }),
                Code: [''],
                Name: [''],
                Remark: [''],
                Sort: [''],
                CurrentQuantity: [''],
                IsCounted: [''],
                CountedQuantity: [''],
                Zone: [''],
                Row: [''],
                Level: [''],
                Location: [''],
                UoMName: new FormControl({ value: '', disabled: true }), //de hien thi
                ItemName: new FormControl({ value: '', disabled: true }), //de hien thi
                IsDisabled: new FormControl({ value: '', disabled: true }),
                IsDeleted: new FormControl({ value: '', disabled: true }),
                CreatedBy: new FormControl({ value: '', disabled: true }),
                CreatedDate: new FormControl({ value: '', disabled: true }),
                ModifiedBy: new FormControl({ value: '', disabled: true }),
                ModifiedDate: new FormControl({ value: '', disabled: true }),
            })

            this.isModalAddFieldOpen = true;

            this.isModalAddRangesOpen = false;
        }
    }

    dismissModal(event) {
        this.isModalAddRangesOpen = false;
        this.isModalAddFieldOpen = false;
    }

    applyItems() {
        var items = this.field.getRawValue();
        if (items) {
            var ids = items.IDItem;
            if(ids) this.saveFields(ids);
        }
        this.isModalAddFieldOpen = false;
    }

    async saveChange() {
        let submitItem = this.getDirtyValues(this.formGroup);
        super.saveChange2();
    }

    removeField(fg, j) {
        let groups = <FormArray>this.formGroup.controls.CycleCountDetails;
        let itemToDelete = fg.getRawValue();
        this.cycleCountDetailService.delete(itemToDelete).then(result => {
            groups.removeAt(j);
        })
    }

    checkedFields:any = new FormArray([]);
    changeSelection(i, e = null) {
        i.get('IsChecked').value = !i.get('IsChecked').value;

		if ( i.get('IsChecked').value) {
			this.checkedFields.push(i);
		}
		else {
			let index = this.checkedFields.findIndex(d => d.get('Id').value == i.get('Id').value)
			this.checkedFields.removeAt(index);
        }
    }

    deleteItems(){
        if (this.pageConfig.canDelete) {
            let itemsToDelete = this.checkedFields.getRawValue();
            this.env.showPrompt('Bạn chắc muốn xóa ' + itemsToDelete.length + ' đang chọn?', null, 'Xóa ' + itemsToDelete.length + ' dòng').then(_=>{
                this.env.showLoading('Xin vui lòng chờ trong giây lát...',  this.cycleCountDetailService.delete(itemsToDelete))
                .then(_ => {
                    this.removeSelectedItems();
                    this.env.showTranslateMessage('erp.app.app-component.page-bage.delete-complete','success');
                    this.isAllChecked = false;
                }).catch(err => {
                    this.env.showMessage('Không xóa được, xin vui lòng kiểm tra lại.');
                    console.log(err);
                });
            });
        }
    }

    removeSelectedItems(){
        let groups = <FormArray>this.formGroup.controls.CycleCountDetails;
        this.checkedFields.controls.forEach(fg => {
            const indexToRemove = groups.controls.findIndex(control => control.get('Id').value === fg.get('Id').value);
            groups.removeAt(indexToRemove);
        })
        this.checkedFields =  new FormArray([]);
    }

   
    markNestedNode(ls, Id) {
        ls.filter(d => d.IDParent == Id).forEach(i => {
            if (i.Type == 'Warehouse')
                i.disabled = false;
            this.markNestedNode(ls, i.Id);
        });
    }

    isAllChecked : boolean = false;
	toggleSelectAll() {
        let groups = <FormArray>this.formGroup.controls.CycleCountDetails;
		groups.controls.forEach(i => {
			i.get('IsChecked').setValue(this.isAllChecked)
			this.checkedFields.push(i);
		});
	}

    @ViewChild('importfile') importfile: any;
    onClickImport() {
        this.importfile.nativeElement.value = "";
        this.importfile.nativeElement.click();
    }

    async import(event) {
        if (this.submitAttempt) {
            this.env.showTranslateMessage('erp.app.pages.sale.sale-order.message.importing', 'primary');
            return;
        }
        this.submitAttempt = true;
        this.env.publishEvent({ Code: 'app:ShowAppMessage', IsShow: true, Id: 'FileImport', Icon: 'flash', IsBlink: true, Color: 'danger', Message: 'đang import' });
        const formData: FormData = new FormData();
		formData.append('fileKey', event.target.files[0], event.target.files[0].name);
        new Promise((resolve, reject) => {
            this.commonService.connect("UPLOAD",ApiSetting.apiDomain("WMS/CycleCount/ImportExcel/"+this.formGroup.get('Id').value), formData).toPromise()
            .then((data) => {
                this.submitAttempt = false;
                this.env.publishEvent({ Code: 'app:ShowAppMessage', IsShow: false, Id: 'FileImport' });
                this.refresh();
                this.download(data);
            }).catch(err => {
                this.submitAttempt = false;
                this.env.publishEvent({ Code: 'app:ShowAppMessage', IsShow: false, Id: 'FileImport' });
                this.refresh();
                this.env.showTranslateMessage('erp.app.pages.sale.sale-order.message.import-error', 'danger');
            })

		});
       
    }

    segmentView = 's1';
    segmentChanged(ev: any) {
        this.segmentView = ev.detail.value;
    }
}
