import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, HRM_StaffProvider, SYS_SchemaProvider, WMS_AdjustmentProvider, WMS_CycleCountDetailProvider, WMS_CycleCountProvider, WMS_CycleCountTaskProvider, WMS_ItemProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, RequiredValidator, Validators } from '@angular/forms';
import { Schema } from 'src/app/models/options-interface';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonService } from 'src/app/services/core/common.service';
import { Subject, catchError, concat, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { lib } from 'src/app/services/static/global-functions';
import { er, s } from '@fullcalendar/core/internal-common';

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
    isHideEqualityTask: boolean = false;
    filterItems: any;
    branchList
    constructor(
        public pageProvider: WMS_CycleCountProvider,
        public cycleCountDetailService: WMS_CycleCountDetailProvider,
        public cycleCountTaskService: WMS_CycleCountTaskProvider,
        public adjustmentService: WMS_AdjustmentProvider,
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
        public router: Router,
    ) {
        super();
        //temp
        this.pageConfig.isDetailPage = true;
     
        this.formGroup = this.formBuilder.group({
            Id: new FormControl({ value: '', disabled: true }),
            IDBranch: ['', Validators.required],
            Code: [''],
            Name: [''],
            Remark: [''],
            Sort: [''],
            CountType: [''],
            CountDate: [''],
            Status: ['Draft', Validators.required],
            Counters: [''],
            _Counters: [''],
            IsPrintAllCounterPerSheet: [false],
            IsShowSysQty: [false],
            IsCountByLocation: [false],
            IsCountByLot: [false],
            CycleCountDetails: this.formBuilder.array([]),
            IDAdjustment: [0],
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
            { Name: 'Kiểm đơn giản', Code: 'Simple' },
            { Name: 'Kiểm thẩm định', Code: 'Validation' },
        ];

        this.schemaService.getAnItem(13)
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
        if (this.item?.Status == 'Open') {
            this.pageConfig.canEdit = false;
        }
        super.loadedData(event, ignoredFromGroup);

        this.patchFieldsValue();
        // this._itemDataSource.initSearch();

        if (this.item.Counters) {
            var counters = JSON.parse(this.item.Counters);
            if (counters) {
                this.formGroup.get('_Counters').setValue(counters.map(d => d.Id));
            }
            this._staffDataSource.selected = counters;
        }
        this._staffDataSource.initSearch();
        this.sortDetail = {};
        if (this.pageConfig.canUpdateQuantity && !this.pageConfig.canEdit) {
            let groups = <FormArray>this.formGroup.controls.CycleCountDetails;
            groups.controls.forEach(fg => {
                fg.get('CountedQuantity').enable();
            })
        }

        this.formGroup.get('Status').markAsDirty();
        console.log(this.formGroup);
        this.isHideEqualityTask = false;
        this.removeSelectedItems();
        this.isAllChecked = false;
        this.isAllCheckedModal = false;
        this.toggleSelectAllInModal();
        this.toggleSelectAll();
      
        //  this.patchFormValue();
    }

    
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

    private patchFieldsValue() {
        this.pageConfig.showSpinner = true;
        this.formGroup.controls.CycleCountDetails = new FormArray([]);
        if (this.item.CycleCountDetails?.length) {
            this.item.CycleCountDetails.forEach(i => this.addField(i));
        }

        if (!this.pageConfig.canEdit) {
            this.formGroup.controls.CycleCountDetails.disable();
            let groups = <FormArray>this.formGroup.controls.CycleCountDetails;
            groups.controls.forEach(s=>{
                if(s.get('CycleCountTasks').value?.length > 0 && s.get('Status').value != 'Closed' && s.get('IsCounted').value){
                    s.get('IsCheckedModal').enable();
                }
            })
        }
        this.pageConfig.showSpinner = false;
    }

    addField(field: any, markAsDirty = false) {
        let groups = <FormArray>this.formGroup.controls.CycleCountDetails;
        let group = this.formBuilder.group({
            IDCycleCount: [this.item.Id],
            Id: new FormControl({ value: field.Id, disabled: true }),
            IDItem: new FormControl({ value: field.IDItem, disabled: false }),
            IDUoM: new FormControl({ value: field.IDUoM, disabled: false }),
            IDCycleCountTask: new FormControl({ value: field.IDCycleCountTask, disabled: true }),

            Status: [field.Status || 'New'],
            CurrentQuantity: [field.CurrentQuantity],
            CycleCountTasks: this.formBuilder.array(field.CycleCountTasks),
            IsCounted: [field.IsCounted],
            CountedQuantity: new FormControl({ value: field.CountedQuantity, disabled: false }),
            ZoneName: [field.ZoneName],
            IDLocation: [field.IDLocation],
            LocationName: [field.LocationName],
            IDLot: [field.IDLot],
            LotName: [field.LotName],

            UoMName: new FormControl({ value: field.UoMName, disabled: true }), //de hien thi
            ItemName: new FormControl({ value: field.ItemName, disabled: true }), //de hien thi

            IsChecked: new FormControl({ value: false, disabled: false }),
            IsCheckedModal: new FormControl({ value: false, disabled: field.Status == 'Closed' }),
            IsShowInModal: new FormControl({ value: true, disabled: false }),

            QuantityAdjusted: new FormControl({ value: 0, disabled: false }),

            Sort: [field.Sort],
            IsDisabled: new FormControl({ value: field.IsDisabled, disabled: true }),
            IsDeleted: new FormControl({ value: field.IsDeleted, disabled: true }),
            CreatedBy: new FormControl({ value: field.CreatedBy, disabled: true }),
            CreatedDate: new FormControl({ value: field.CreatedDate, disabled: true }),
            ModifiedBy: new FormControl({ value: field.ModifiedBy, disabled: true }),
            ModifiedDate: new FormControl({ value: field.ModifiedDate, disabled: true }),

        })
        // field.DetailCounters?.forEach(d=>d.)
        if (field.CycleCountTasks?.length <= 0 || !field.IsCounted) {
            group.get('IsCheckedModal').disable();
        }
        
        groups.push(group);
    }

    filterConfig(e) {
        e.Logicals?.unshift({
            Dimension: 'IDBranch',
            Logicals: [],
            Operator: "=",
            Value: this.formGroup.get('IDBranch').value
        })

        let config = {
            Schema: { Id: 13, Type: "DBView", Code: "WMS_LotLocLPN", Name: "Báo cáo tồn kho" },
            CompareBy: [{ Property: "ItemId" }, { Property: "ItemName" }, { Property: "UoMId" }],
            MeasureBy: [{ Property: "QuantityOnHand", Method: "sum", Title: "CurrentQuantity" }],
            Transform: { Filter: e }
        }
        if (this.formGroup.get('IsCountByLocation').value) {
            config.CompareBy.push({ Property: 'LocationId' }, { Property: 'LocationName' })
        }
        if (this.formGroup.get('IsCountByLot').value) {
            config.CompareBy.push({ Property: 'LotId' })
        }
        this.env.showLoading('Vui lòng chờ load dữ liệu...', this.pageProvider.commonService.connect('POST', 'BI/Schema/QueryReportData', config).toPromise())
            .then((data: any) => {
                if (data) {
                    this.tempItemList = data.Data;
                    this.countItem = data.Data.length;
                    this.env.showPrompt('Bạn có muốn áp dụng ?', null, 'Tìm thấy ' + this.countItem + ' dòng dữ liệu').then(_ => {
                        let obj: any = {
                            id: this.formGroup.get('Id').value,
                            items: this.tempItemList,
                        }
                        this.isModalAddRangesOpen = false;
                        this.env.showLoading('Vui lòng chờ load dữ liệu...', this.pageProvider.commonService.connect('POST', 'WMS/CycleCount/PostListDetail', obj).toPromise())
                            .then((result: any) => {
                                if(result>0){
                                    this.refresh();   
                                }
                            })
                               

                    }).catch(err => {
                    });
                }
            })
    }

    changeCountType(e) {
        if (e.Code == 'Simple') {//kiểm đơn
            this.formGroup.get('Counters').setValue(null);
            this.formGroup.get('_Counters').setValue(null);
        }
        this.formGroup.get('Counters').markAsDirty();
        this.saveChange();
    }
    changeCounters(e) {
        this.formGroup.get('Counters').setValue(JSON.stringify(e));
        this.formGroup.get('Counters').markAsDirty();
        this.saveChange();
    }

    changeWarehouse(ev) {
        this.formGroup.get('IDBranch').setValue(ev.Id);
        this.formGroup.get('IDBranch').markAsDirty();
        this.saveChange();
    }

    changeStatus() {
        this.query.ToStatus = 'Open';
        this.query.Id = this.formGroup.get('Id').value
        this.env.showLoading('Vui lòng chờ load dữ liệu...', this.pageProvider.commonService.connect('GET', 'WMS/CycleCount/ChangeStatus/', this.query).toPromise())
        .then((result: any) => {
            this.refresh();
        })
        
    }
    changeShowTaskDetail() {
        this.isHideEqualityTask = !this.isHideEqualityTask;
        if (this.isHideEqualityTask) {
            this.formGroup.get('CycleCountDetails')['controls'].forEach(c => {
                if (c.controls.CycleCountTasks?.controls?.every(e => e.value?.CountedQuantity === c.get('CurrentQuantity').value) || c.get('Status').value == 'Closed') {
                    c.get('IsShowInModal').setValue(false);
                    console.log(c.get('IsShowInModal').value)
                }


            })
        }
        else {
            this.formGroup.get('CycleCountDetails')['controls'].forEach(c => {
                c.get('IsShowInModal').setValue(true);
                console.log(c.get('IsShowInModal').value)
            })
        }

    }

    changeLocationAndLot(e, type) {
        let detailLength = this.formGroup.getRawValue().CycleCountDetails.length
        if (detailLength > 0) {
            this.env.showPrompt('Thay đổi ' + type + ' sẽ xoá hết chi tiết hàng kiểm hiện tại, bạn có tiếp tục?', null, 'Xóa ' + detailLength + ' dòng')
                .then(_ => {
                    this.cycleCountDetailService.delete(this.formGroup.getRawValue().CycleCountDetails)
                        .then(rs => {
                            this.removeSelectedItems();
                            this.env.showTranslateMessage('erp.app.app-component.page-bage.delete-complete', 'success');
                            this.isAllChecked = false;
                            let value = this.formGroup.get('CycleCountDetails').value.map(d => d.IDItem).join(',')
                            let filter = {
                                Dimension: 'logical',
                                Logicals: [
                                    {
                                        Dimension: 'ItemId',
                                        Logicals: [],
                                        Operator: "IN",
                                        Value: value
                                    },
                                    {
                                        Dimension: 'IDBranch',
                                        Logicals: [],
                                        Operator: "=",
                                        Value: this.formGroup.get('IDBranch').value
                                    }
                                ],
                                Operator: "AND",
                                Value: null
                            }

                            let config = {
                                Schema: { Id: 13, Type: "DBView", Code: "WMS_LotLocLPN", Name: "Báo cáo tồn kho" },
                                CompareBy: [{ Property: "ItemId" }, { Property: "ItemName" }, { Property: "UoMId" }],
                                MeasureBy: [{ Property: "QuantityOnHand", Method: "sum", Title: "CurrentQuantity" }],
                                Transform: { Filter: filter }
                            }
                            if (this.formGroup.get('IsCountByLocation').value) {
                                config.CompareBy.push({ Property: 'LocationId' }, { Property: 'LocationName' })
                            }
                            if (this.formGroup.get('IsCountByLot').value) {
                                config.CompareBy.push({ Property: 'LotId' })
                            }
                            this.env.showLoading('Vui lòng chờ load dữ liệu...', this.pageProvider.commonService.connect('POST', 'BI/Schema/QueryReportData', config).toPromise())
                                .then((data: any) => {
                                    if (data) {
                                        let obj: any = {
                                            id: this.formGroup.get('Id').value,
                                            items: data.Data,
                                        }
                                        this.env.showLoading('Vui lòng chờ load dữ liệu...', this.pageProvider.commonService.connect('POST', 'WMS/CycleCount/PostListDetail', obj).toPromise())
                                            .then((result: any) => {
                                                this.refresh();
                                            })
                                    }
                                })
                            this.saveChange();

                        }).catch(err => {
                            this.env.showMessage('Không xóa được, xin vui lòng kiểm tra lại.');
                            console.log(err);
                        });
                }).catch(er => {
                    let formControlName = '';
                    if (type == "Location") formControlName = 'IsCountByLocation';
                    if (type == "Lot") formControlName = 'IsCountByLot';
                    this.formGroup.get(formControlName).setValue(!this.formGroup.get(formControlName).value);
                });
        }
        else {
            this.formGroup.get('IsCountBy'+type).markAsDirty();
            this.saveChange();
            
        }
    }

    trackChangeCountedFormGroup: any =new FormArray([]);
    isSubmitUpdateButton = false;
    setCounterForCycleCountDetail(fg, task) {
        if(fg.get('IDCycleCountTask').value == task.Id){
            return;
        }
        fg.get('CountedQuantity').setValue(task.CountedQuantity);
        fg.get('IsCounted').setValue(true);
        fg.get('IDCycleCountTask').setValue(task.Id);

        fg.get('CountedQuantity').markAsDirty();
        fg.get('IsCounted').markAsDirty();
        fg.get('IDCycleCountTask').markAsDirty();
        this.isSubmitUpdateButton = false;
        this.trackChangeCountedFormGroup.push(fg);
    }
    createAdjustment() {
        if (this.checkCycleCountDetailsInModal.controls.some(d => d.get('CountedQuantity').value == d.get('CurrentQuantity').value)) {
            this.env.showTranslateMessage('Counted quantity and current quantity are equally ', 'danger');
            return;
        };
        let idsCycleCountDetail = this.checkCycleCountDetailsInModal.getRawValue().map(m => m.Id);
        let obj ={
            id : this.item.Id,
            idsCycleCountDetail:idsCycleCountDetail
        } 
        // this.isModalMergeOpen = false;
            this.pageProvider.commonService.connect('POST', 'WMS/CycleCount/PostAdjustment/', obj).toPromise()
            .then((result: any) => {
                if(result){
                    let groups = <FormArray>this.formGroup.controls.CycleCountDetails;
                    idsCycleCountDetail.forEach(id=>{
                        let fg = groups.controls.find(d=>d.get('Id').value == id)
                        fg?.get('Status').setValue('Closed');
                  
                        fg?.get('IsCheckedModal').setValue(false)
                        fg?.disable();
                        
                    })
                    this.env.showTranslateMessage('Saving completed!','success');
                }
              
            }).catch(err => {
                this.env.showTranslateMessage('Cannot save, please try again', 'danger');
                console.log(err);
            });

    }
    updateCountedQuantity() {
        this.isSubmitUpdateButton = true;
        let filteredCycleCountDetails = this.formGroup.getRawValue().CycleCountDetails.filter(detail => {
            // Assuming 'CycleCountTasks' is an array property of 'detail'
            if (detail.CycleCountTasks && detail.CycleCountTasks.length > 0 && !detail.IsCounted) {
                // Check if all 'CurrentQuantity' values are equal
                return detail.CycleCountTasks.every(task => task.CountedQuantity === detail.CurrentQuantity);
            } else {
                // If there are no associated tasks, return true to include the detail
                return false;
            }
        }).map(detail => ({
            Id: detail.Id,
            CountedQuantity: detail.CurrentQuantity,
            IDCycleCountTask: null
        }));
        let obj = filteredCycleCountDetails.concat(this.trackChangeCountedFormGroup.getRawValue().map(m=>({
            Id: m.Id,
            CountedQuantity: m.CurrentQuantity,
            IDCycleCountTask: m.IDCycleCountTask
            })
        ));
        if(obj.length == 0 ) return;
        this.env.showLoading('Vui lòng chờ load dữ liệu...', this.pageProvider.commonService.connect('PUT', 'WMS/CycleCount/PutCustomListDetail', obj).toPromise())
            .then(rs => {
                if (rs) {
                    this.isSubmitUpdateButton = true;
                    this.trackChangeCountedFormGroup.controls.forEach(s=>{
                        if(s.get('Status').value != 'Closed'){
                            s.get('IsCheckedModal').enable();
                        }
                    })
                    this.trackChangeCountedFormGroup = new FormArray([]); 
                    this.env.showTranslateMessage('Saving completed!', 'success');
                    // this.dismissModal();
                }
                else {
                    this.env.showTranslateMessage('Cannot save, please try again', 'danger');
                }
            })
    }

    isModalAddRangesOpen = false;
    isModalMergeOpen = false;
    presentModal(modal) {
        if (modal == 'addRanges') {
            this.isModalAddRangesOpen = true;
            this.isModalMergeOpen = false;
        }
        if (modal == 'merge') {
            this.isModalMergeOpen = true;
            this.isModalAddRangesOpen = false;
        }
    }

    dismissModal(type) {
        this.isModalAddRangesOpen = false;
        this.isModalMergeOpen = false;
        this.isSubmitUpdateButton = false;
        // if (type == 'merge') {
         
        //     // if (!this.isSubmitUpdateButton && this.trackChangeCounted.length > 0) {
        //     //     this.refresh();
        //     // }
        //     this.isSubmitUpdateButton = false;
        //     this.trackChangeCounted = [];
        //     return;
        // }
    }

    removeField(fg, j) {
        let groups = <FormArray>this.formGroup.controls.CycleCountDetails;
        let itemToDelete = fg.getRawValue();
        this.env.showPrompt('Bạn chắc muốn xóa ?', null, 'Xóa ' + 1 + ' dòng').then(_ => {
            this.cycleCountDetailService.delete(itemToDelete).then(result => {
                groups.removeAt(j);
            })
        })
    }

    checkCycleCountDetails: any = new FormArray([]);
    checkCycleCountDetailsInModal: any = new FormArray([]);

    changeSelection(i, view, e = null) {
        if (view == 'main') {
            if (i.get('IsChecked').value) {
                this.checkCycleCountDetails.push(i);
            }
            else {
                let index = this.checkCycleCountDetails.getRawValue().findIndex(d => d.Id == i.get('Id').value)
                this.checkCycleCountDetails.removeAt(index);
            }
        }
        if (view == 'modal') {
            if (i.get('IsCheckedModal').value) {
                this.checkCycleCountDetailsInModal.push(i);
            }
            else {
                let index = this.checkCycleCountDetailsInModal.getRawValue().findIndex(d => d.Id == i.get('Id').value)
                this.checkCycleCountDetailsInModal.removeAt(index);
            }
        }

    }

    deleteItems() {
        if (this.pageConfig.canDelete) {
            let itemsToDelete = this.checkCycleCountDetails.getRawValue();
            this.env.showPrompt('Bạn chắc muốn xóa ' + itemsToDelete.length + ' đang chọn?', null, 'Xóa ' + itemsToDelete.length + ' dòng').then(_ => {
                this.env.showLoading('Xin vui lòng chờ trong giây lát...', this.cycleCountDetailService.delete(itemsToDelete))
                    .then(_ => {
                        this.removeSelectedItems();
                        this.env.showTranslateMessage('erp.app.app-component.page-bage.delete-complete', 'success');
                        this.isAllChecked = false;
                    }).catch(err => {
                        this.env.showMessage('Không xóa được, xin vui lòng kiểm tra lại.');
                        console.log(err);
                    });
            });
        }
    }

    removeSelectedItems() {
        let groups = <FormArray>this.formGroup.controls.CycleCountDetails;
        this.checkCycleCountDetails.controls.forEach(fg => {
            const indexToRemove = groups.controls.findIndex(control => control.get('Id').value === fg.get('Id').value);
            groups.removeAt(indexToRemove);
        })

        this.checkCycleCountDetails = new FormArray([]);
    }


    sortDetail: any = {};
    sortToggle(field) {
        if (!this.sortDetail[field]) {
            this.sortDetail[field] = field
        } else if (this.sortDetail[field] == field) {
            this.sortDetail[field] = field + '_desc'
        }
        else {
            delete this.sortDetail[field];
        }
        // let s = Object.keys(sortTerms).reduce(function (res, v) {
        //     return res.concat(sortTerms[v]);
        // }, []);
        if (Object.keys(this.sortDetail).length === 0) {
            this.refresh();
        }
        else {
            this.reInitCycleCountDetails();
        }
    }

    reInitCycleCountDetails() {
        const cycleCountDetailsArray = this.formGroup.get('CycleCountDetails') as FormArray;
        this.item.CycleCountDetails = cycleCountDetailsArray.getRawValue();
        for (const key in this.sortDetail) {
            if (this.sortDetail.hasOwnProperty(key)) {
                const value = this.sortDetail[key];
                this.sortByKey(value);
            }
        }
        cycleCountDetailsArray.clear();
        this.item.CycleCountDetails.forEach(s => this.addField(s));
    }

    sortByKey(key: string, desc: boolean = false) {
        if (key.includes('_desc')) {
            key = key.replace('_desc', '');
            desc = true;
        }
        this.item.CycleCountDetails.sort((a, b) => {
            const comparison = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
            return desc ? -comparison : comparison;
        });

    }

    markNestedNode(ls, Id) {
        ls.filter(d => d.IDParent == Id).forEach(i => {
            if (i.Type == 'Warehouse')
                i.disabled = false;
            this.markNestedNode(ls, i.Id);
        });
    }

    isAllChecked: boolean = false;
    isAllCheckedModal: boolean = false;
    toggleSelectAllInModal() {
        let groups = <FormArray>this.formGroup.controls.CycleCountDetails;
        if (!this.isAllCheckedModal) {
            this.checkCycleCountDetailsInModal = new FormArray([]);
        }
        groups.controls.forEach(i => {
            if (!i.get('IsCheckedModal').disabled && i.get('Status').value != 'Closed' && i.get('IsShowInModal').value && i.getRawValue().CycleCountTasks?.length > 0) {
                i.get('IsCheckedModal').setValue(this.isAllCheckedModal)
                if (this.isAllCheckedModal) this.checkCycleCountDetailsInModal.push(i)
            }
        });
        console.log(this.checkCycleCountDetailsInModal)
    }
    toggleSelectAll() {
        if(!this.pageConfig.canEdit) return;
        let groups = <FormArray>this.formGroup.controls.CycleCountDetails;
        if (!this.isAllChecked) {
            this.checkCycleCountDetails = new FormArray([]);
        }
        groups.controls.forEach(i => {
          
            i.get('IsChecked').setValue(this.isAllChecked)
            if (this.isAllChecked) this.checkCycleCountDetails.push(i)
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
            this.commonService.connect("UPLOAD", ApiSetting.apiDomain("WMS/CycleCount/ImportExcel/" + this.formGroup.get('Id').value), formData).toPromise()
                .then((resp:any) => {
                    this.submitAttempt = false;
                    this.env.publishEvent({ Code: 'app:ShowAppMessage', IsShow: false, Id: 'FileImport' });
                    this.refresh();
                    if (resp.ErrorList && resp.ErrorList.length) {
                        let message = '';
                        for (let i = 0; i < resp.ErrorList.length && i <= 5; i++)
                            if (i == 5) message += '<br> Còn nữa...';
                            else {
                                const e = resp.ErrorList[i];
                                message += '<br> ' + e.Id + '. Tại dòng ' + e.Line + ': ' + e.Message;
                            }
                        this.env.showPrompt('Có ' + resp.ErrorList.length + ' lỗi khi import:' + message, 'Bạn có muốn xem lại các mục bị lỗi?', 'Có lỗi import dữ liệu').then(_=>{
                            this.downloadURLContent(ApiSetting.mainService.base + resp.FileUrl);
                        }).catch(e => { });
                    }
                    else {
                        this.env.showTranslateMessage('Import completed!','success');
                    }
                    // this.download(data);
                }).catch(err => {
                    this.submitAttempt = false;
                    this.env.publishEvent({ Code: 'app:ShowAppMessage', IsShow: false, Id: 'FileImport' });
                    this.refresh();
                    this.env.showTranslateMessage('erp.app.pages.sale.sale-order.message.import-error', 'danger');
                })

        });

    }

    async export() {
        if (this.submitAttempt) return;
        this.query.IDCycleCount = this.formGroup.get('Id').value;
        this.submitAttempt = true;
        this.env.showLoading('Vui lòng chờ export dữ liệu...', this.cycleCountDetailService.export(this.query))
            .then((response: any) => {
                this.downloadURLContent(ApiSetting.mainService.base + response);
                this.submitAttempt = false;
            }).catch(err => {
                this.submitAttempt = false;
            });
    }
///////// Tá
    @ViewChild('importfileTask') importfileTask: any;
    onClickImportTask() {
        this.importfileTask.nativeElement.value = "";
        this.importfileTask.nativeElement.click();
    }

    async importTask(event) {
        if (this.submitAttempt) {
            this.env.showTranslateMessage('erp.app.pages.sale.sale-order.message.importing', 'primary');
            return;
        }
        this.submitAttempt = true;
  
        this.dismissModal('merge');
        this.env.publishEvent({ Code: 'app:ShowAppMessage', IsShow: true, Id: 'FileImport', Icon: 'flash', IsBlink: true, Color: 'danger', Message: 'đang import' });
        const formData: FormData = new FormData();
        formData.append('fileKey', event.target.files[0], event.target.files[0].name);
        this.env.showLoading('Vui lòng chờ import dữ liệu...',   this.commonService.connect("UPLOAD", ApiSetting.apiDomain("WMS/CycleCount/ImportTaskDetail/" + this.formGroup.get('Id').value), formData).toPromise())
        .then((resp:any) => {
            this.submitAttempt = false;
            this.env.publishEvent({ Code: 'app:ShowAppMessage', IsShow: false, Id: 'FileImport' });
            if (resp.ErrorList && resp.ErrorList.length) {
                let message = '';
                for (let i = 0; i < resp.ErrorList.length && i <= 5; i++)
                    if (i == 5) message += '<br> Còn nữa...';
                    else {
                        const e = resp.ErrorList[i];
                        message += '<br> ' + e.Id + '. Tại dòng ' + e.Line + ': ' + e.Message;
                    }
                this.env.showPrompt('Có ' + resp.ErrorList.length + ' lỗi khi import:' + message, 'Bạn có muốn xem lại các mục bị lỗi?', 'Có lỗi import dữ liệu').then(_=>{
                    this.downloadURLContent(ApiSetting.mainService.base + resp.FileUrl);
                }).catch(e => { });
                

            }
            else {
                this.env.showTranslateMessage('Import completed!','success');
            }
            
            this.refresh();
            this.isModalMergeOpen = true;
            // this.download(data);
        }).catch(err => {
            this.submitAttempt = false;
            this.env.publishEvent({ Code: 'app:ShowAppMessage', IsShow: false, Id: 'FileImport' });
            this.env.showTranslateMessage('erp.app.pages.sale.sale-order.message.import-error', 'danger');
        })
        // new Promise((resolve, reject) => {
        //     this.commonService.connect("UPLOAD", ApiSetting.apiDomain("WMS/CycleCount/ImportTaskDetail/" + this.formGroup.get('Id').value), formData).toPromise()
              

        // });

    }

    async exportTask() {
        if (this.submitAttempt) return;
        this.query.Id = this.formGroup.get('Id').value;
        this.submitAttempt = true;
        this.env.showLoading('Vui lòng chờ export dữ liệu...', this.cycleCountTaskService.export(this.query))
            .then((response: any) => {
                this.downloadURLContent(ApiSetting.mainService.base + response);
                this.submitAttempt = false;
            }).catch(err => {
                this.submitAttempt = false;
            });
    }


    saveChangeDetail(fg: FormGroup) {
        this.saveChange2(fg, null, this.cycleCountDetailService)
    }

    segmentView = 's1';
    segmentChanged(ev: any) {
        this.segmentView = ev.detail.value;
    }

    async saveChange() {
        let submitItem = this.getDirtyValues(this.formGroup);
        super.saveChange2();
    }

}


//Search Item
//field: FormGroup;
// _itemDataSource = {
//     searchProvider: this.itemService,
//     loading: false,
//     input$: new Subject<string>(),
//     selected: [],
//     items$: null,
//     initSearch() {
//         this.loading = false;
//         this.items$ = concat(
//             of(this.selected),
//             this.input$.pipe(
//                 distinctUntilChanged(),
//                 tap(() => this.loading = true),
//                 switchMap(term => this.searchProvider.search({ Take: 20, Skip: 0, Term: term }).pipe(
//                     catchError(() => of([])), // empty list on error
//                     tap(() => this.loading = false)
//                 ))

//             )
//         );
//     }
// }

// applyItems() {
//     var items = this.field.getRawValue();
//     if (items) {
//         var ids = items.IDItem;
//         if (ids) this.saveFields(ids);
//     }
//     this.isModalAddFieldOpen = false;
// }
