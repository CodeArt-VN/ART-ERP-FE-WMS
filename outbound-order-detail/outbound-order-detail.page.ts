import { ChangeDetectorRef, Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import {
	BRA_BranchProvider,
	CRM_ContactProvider,
	HRM_StaffProvider,
	SHIP_VehicleProvider,
	WMS_ItemProvider,
	WMS_OutboundOrderDetailProvider,
	WMS_OutboundOrderProvider,
} from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { FormArray, FormBuilder, FormControl, Validators } from '@angular/forms';
import { Schema } from 'src/app/interfaces/options-interface';
import { ActivatedRoute, NavigationExtras } from '@angular/router';
import { CommonService } from 'src/app/services/core/common.service';
import { Subject, catchError, concat, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { lib } from 'src/app/services/static/global-functions';

@Component({
	selector: 'app-outbound-order-detail',
	templateUrl: 'outbound-order-detail.page.html',
	styleUrls: ['outbound-order-detail.page.scss'],
	standalone: false,
})
export class OutboundOrderDetailPage extends PageBase {
	// #region Variables
	countTypeDataSource: any;
	itemList: any;
	vehicleList: any = [];
	selectedVehicles: any = [];
	tempItemList: any;
	countItem: number = 0;
	branchList;
	storerList;
	packingTypeDatasource;
	statusList = [];
	isAllChecked = false;
	checkedOutboundOrderDetails: any = new FormArray([]);
	// #endregion

	// #region Init
	constructor(
		public pageProvider: WMS_OutboundOrderProvider,
		public outboundOrderDetailService: WMS_OutboundOrderDetailProvider,
		public vehicleService: SHIP_VehicleProvider,
		public staffService: HRM_StaffProvider,
		public itemService: WMS_ItemProvider,
		public commonService: CommonService,
		public contactProvider: CRM_ContactProvider,
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
		public location: Location
	) {
		super();
		this.pageConfig.isDetailPage = true;
		this.formGroup = this.formBuilder.group({
			Id: new FormControl({ value: '', disabled: true }),
			IDWarehouse: ['', Validators.required],
			IDStorer: ['', Validators.required],
			OutboundOrderDetails: this.formBuilder.array([]),

			PackingTag: ['', Validators.required],
			OrderDate: ['', Validators.required],
			DeliveryDate: ['', Validators.required],
			ShippedDate: [''],
			Status: ['New', Validators.required],

			Remark: [''],
			Sort: [''],
			IsDisabled: new FormControl({ value: '', disabled: true }),
			IsDeleted: new FormControl({ value: '', disabled: true }),
			CreatedBy: new FormControl({ value: '', disabled: true }),
			CreatedDate: new FormControl({ value: '', disabled: true }),
			ModifiedBy: new FormControl({ value: '', disabled: true }),
			ModifiedDate: new FormControl({ value: '', disabled: true }),
		});
	}

	_contactDataSource = {
		searchProvider: this.contactProvider,
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
								SkipMCP: true,
								SkipAddress: true,
								IsStorer: true,
								Term: term,
							})
							.pipe(
								catchError(() => of([])), // empty list on error
								tap(() => (this.loading = false))
							)
					)
				)
			);
		},
	};
	// #endregion

	// #region Load
	preLoadData(event) {
		this.statusList = [
			{ Code: 'New', Name: 'Mới', Color: 'warning' },
			{ Code: 'Open', Name: 'Mở', Color: 'primary' },
			{ Code: 'Allocated', Name: 'Đã chỉ định', Color: 'secondary' },
			{ Code: 'ShippingAllocated', Name: 'Đã phân tài', Color: 'secondary' },
			{ Code: 'Closed', Name: 'Đã đóng', Color: 'success' },
		];

		this.packingTypeDatasource = [
			{ Name: 'Vehicle', Code: 'Vehicle' },
			{ Name: 'Vehicle\\Customer', Code: 'Customer' },
			{ Name: 'Vehicle\\Customer\\SO', Code: 'SaleOrder' },
			{ Name: 'Vehicle\\Customer\\SOItem', Code: 'Item' },
		];
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
						if (i.Type == 'Warehouse') i.disabled = false;
					});
					this.markNestedNode(this.branchList, this.env.selectedBranch);
					console.log(this.branchList);
				});
			});
		super.preLoadData(event);
	}

	loadedData(event?: any, ignoredFromGroup?: boolean): void {
		if (this.item.Status != 'New') {
			this.pageConfig.canEdit = false;
		}
		super.loadedData(event, ignoredFromGroup);
		if (!this.item.Id) {
			this.formGroup.get('Status').markAsDirty();
		}
		if (this.item.OutboundOrderDetails?.length > 0) {
			const outboundOrdertDetailsArray = this.formGroup.get('OutboundOrderDetails') as FormArray;
			outboundOrdertDetailsArray.clear();
			// this.item.OutboundOrderDetails = listDetail.data;
			this.buildFlatTree(this.item.OutboundOrderDetails, null, false).then((resp: any) => {
				this.item.OutboundOrderDetails = resp;
				this.patchFieldsValue();
			});
		}

		if (this.item?._Storer) {
			this._contactDataSource.selected.push(this.item?._Storer);
		}
		this._contactDataSource.initSearch();
		this.query.Id = this.item.Id;
	}
	private patchFieldsValue() {
		this.pageConfig.showSpinner = true;

		if (this.item.OutboundOrderDetails?.length) {
			this.item.OutboundOrderDetails.forEach((i) => {
				this.addField(i);
			});
		}

		if (!this.pageConfig.canEdit) {
			this.formGroup.controls.OutboundOrderDetails.disable();
		}

		this.pageConfig.showSpinner = false;
	}

	addField(field: any, markAsDirty = false, index = 0) {
		let groups = <FormArray>this.formGroup.controls.OutboundOrderDetails;
		let preLoadItems = [
			{
				Id: field?._Item?.Id || field?.IDItem,
				Code: field?._Item?.Code || field?.ItemCode,
				Name: field?._Item?.Name || field?.ItemName,
			},
		];
		let group = this.formBuilder.group({
			_IDItemDataSource: [
				{
					searchProvider: this.itemService,
					loading: false,
					input$: new Subject<string>(),
					that: this,
					selected: preLoadItems,
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
											AllUoM: true,
											Term: term,
											Id_ne: this.that.getExistedItem().length > 0 ? this.that.getExistedItem() : '',
										})
										.pipe(
											catchError(() => of([])), // empty list on error
											tap(() => (this.loading = false))
										)
								)
							)
						);
					},
				},
			],
			IDOutboundOrder: [this.formGroup.get('Id').value, Validators.required],
			Id: new FormControl({ value: field?.Id, disabled: true }),
			IDItem: [field?.IDItem, Validators.required],
			IDUoM: [field?.IDUoM, Validators.required],
			UoMName: [field?.UoMName],
			ItemName: [field?.ItemName],
			ItemCode: [field?.ItemCode || field?._Item?.Code], // for showing ItemCode after saveChangeDetail
			Status: [field?.Status || 'Active'],

			UoMs: [field?._Item?.ItemUoMList || field?.UoMs],
			Quantity: [field?.Quantity, Validators.required],
			QuantityPicked: [field?.QuantityPicked],
			QuantityPacked: [field?.QuantityPacked],
			QuantityShipped: [field?.QuantityShipped],

			IDParent: [field?.IDParent],
			HasChild: [field?.HasChild],
			Levels: [field?.levels],
			ShowDetail: [field?.showdetail],
			Showing: [field?.show],

			IsChecked: new FormControl({ value: false, disabled: false }),
		});

		groups.push(group);
		group.get('_IDItemDataSource').value?.initSearch();

		if (group.get('IDParent').value) group.disable();

		if (markAsDirty) {
			group.get('Status').markAsDirty();
		}
	}
	// #endregion

	// #region Business logic
	IDItemChange(e, group) {
		group.controls.UoMName.setValue('');
		group.controls.UoMs.setValue(e.UoMs);
		group.controls.IDUoM.setValue('');
		group.controls.IDItem.setValue(e.Id);
		group.controls.ItemName.setValue(e.Name);
		group.controls.ShowDetail.setValue(false);
		let childs = this.getAllNested(group);
		if (childs.length > 0) {
			let groups = <FormArray>this.formGroup.controls.OutboundOrderDetails;
			childs.forEach((s) => {
				let indexToRemove = groups.controls.findIndex((control) => control.get('Id').value === s.get('Id').value);
				groups.removeAt(indexToRemove);
			});
		}
	}

	removeItemAndChildren(item) {
		this.item.OutboundOrderDetails.splice(this.item.OutboundOrderDetails.indexOf(item), 1);
		if (item.Id) {
			let itemNesteds = this.item.OutboundOrderDetails.filter((d) => d.IDParent == item.Id);
			itemNesteds.forEach((iNested) => {
				this.removeItemAndChildren(iNested);
			});
		}
	}

	changeStatus() {
		this.query.Id = this.formGroup.get('Id').value;
		this.query.ToStatus = 'Open';
		this.env
			.showLoading('Please wait for a few moments', this.pageProvider.commonService.connect('GET', 'WMS/OutboundOrder/ChangeStatus/', this.query).toPromise())
			.then((result: any) => {
				this.env.showMessage('saved', 'success');
				this.refresh();
			})
			.catch((err) => {
				this.env.showMessage(err.error?.Message ?? err.message, 'danger');
			});
		//   this.query.Id = undefined;
	}

	private getAllNested(fg) {
		let result = [];
		let groups = <FormArray>this.formGroup.controls.OutboundOrderDetails;
		if (fg.get('Id').value) {
			groups.controls
				.filter((d) => d.get('IDParent').value == fg.get('Id').value)
				.forEach((i) => {
					result.push(i);
					result = [...result, ...this.getAllNested(i)];
				});
		}
		return result;
	}

	CreateShippingFromPacking(isForceCreate = false) {
		let packingQuery = {
			Id: this.selectedItems.map((i) => i.Id),
			IDVehicle: this.selectedVehicles.map((i) => i.Id),
			isForceCreate: isForceCreate,
		};
		this.env
			.showLoading('Please wait for a few moments', this.commonService.connect('GET', 'WMS/Packing/CreateShippingFromPacking', packingQuery).toPromise())
			.then((rs) => {
				this.env.showMessage('saved', 'success');
				this.refreshSegmentView();
			})
			.catch((err) => {
				if (err.error && err.error.Message == 'Need more vehicle to ship!') {
					this.env
						.showPrompt('Số lượng xe hiện tại không thể tải hết hàng, bạn có muốn tiếp tục?', null, 'Không đủ tải')
						.then((_) => {
							this.CreateShippingFromPacking(true);
						})
						.catch((err) => {
							this.env.showMessage('Cannot save', 'danger');
						});
				} else {
					this.env.showMessage('Cannot save', 'danger');
				}
			});
	}

	printQRCode() {
		let query = { IDPacking: this.selectedItems.map((d) => d.Id) };
		this.env
			.showLoading('Please wait for a few moments', this.pageProvider.commonService.connect('GET', 'WMS/OutboundOrder/getStaticPaymentQRCode', query).toPromise())
			.then((resp: any) => {
				if (resp) {
					console.log(resp);
					let navigationExtras: NavigationExtras = {
						state: resp.map((m) => {
							return {
								line1: m.Line1,
								line2: m.Line2,
								qrCode: m.Id,
							};
						}),
					};
					this.nav('/qr-code-label', 'forward', navigationExtras);
				}
			})
			.catch((err) => {
				console.log(err);
				if (err.message != null) this.env.showMessage(err.message, 'danger');
				else this.env.showMessage('Không tạo được mã, xin vui lòng kiểm tra lại.', 'danger');
			});
	}

	getExistedItem() {
		let groups = <FormArray>this.formGroup.controls.OutboundOrderDetails;
		return groups.controls.map((g) => g.get('IDItem').value);
	}

	isModalOpen = false;
	presentModal() {
		this.selectedVehicles = [];

		this.isModalOpen = true;
		let queryVehicle = {};
		this.env
			.showLoading('Please wait for a few moments', this.vehicleService.read(queryVehicle))
			.then((result: any) => {
				if (result && result.data.length > 0) this.vehicleList = result.data;
				console.log(this.vehicleList);
			})
			.catch((err) => {
				console.log(err);
			});
	}

	dismissModal(isCreateShipping = false) {
		this.isModalOpen = false;
		if (isCreateShipping) {
			this.CreateShippingFromPacking();
		}
	}

	// #endregion

	//#region Selection
	changeSelection(i, view, e = null) {
		if (i.get('IsChecked').value) {
			this.checkedOutboundOrderDetails.push(i);
			if (i.get('HasChild').value) {
				let groups = <FormArray>this.formGroup.controls.OutboundOrderDetails;
				let subOrders = groups.controls.filter((d) => d.get('IDParent').value == i.get('Id').value);
				subOrders.forEach((sub) => {
					sub.get('IsChecked').setValue(true);
					this.checkedOutboundOrderDetails.push(sub);
					if (sub.get('HasChild').value) this.changeSelection(sub, view);
				});
			}
		} else {
			let index = this.checkedOutboundOrderDetails.getRawValue().findIndex((d) => d.Id == i.get('Id').value);
			this.checkedOutboundOrderDetails.removeAt(index);
			if (i.get('HasChild').value) {
				let groups = <FormArray>this.formGroup.controls.OutboundOrderDetails;
				let subOrders = groups.controls.filter((d) => d.get('IDParent').value == i.get('Id').value);
				subOrders.forEach((sub) => {
					sub.get('IsChecked').setValue(false);
					let indexSub = this.checkedOutboundOrderDetails.getRawValue().findIndex((d) => d.Id == sub.get('Id').value);
					this.checkedOutboundOrderDetails.removeAt(indexSub);
					if (sub.get('HasChild').value) this.changeSelection(sub, view);
				});
			}
		}
	}

	toggleSelectAll() {
		if (!this.pageConfig.canEdit) return;
		let groups = <FormArray>this.formGroup.controls.OutboundOrderDetails;
		if (!this.isAllChecked) {
			this.checkedOutboundOrderDetails = new FormArray([]);
		}
		groups.controls.forEach((i) => {
			i.get('IsChecked').setValue(this.isAllChecked);
			if (this.isAllChecked) this.checkedOutboundOrderDetails.push(i);
		});
	}

	removeSelectedItems() {
		let groups = <FormArray>this.formGroup.controls.OutboundOrderDetails;
		this.checkedOutboundOrderDetails.controls.forEach((fg) => {
			const indexToRemove = groups.controls.findIndex((control) => control.get('Id').value === fg.get('Id').value);
			groups.removeAt(indexToRemove);
		});

		this.checkedOutboundOrderDetails = new FormArray([]);
	}

	isShowCreateShipping = false;
	changeSelectionPacking(e) {
		if (this.selectedItems.length > 0) {
			this.isShowCreateShipping = true;
		} else {
			this.isShowCreateShipping = false;
		}
		this.selectedItems.forEach((s) => {
			if (s.Status == 'ShippingAllocated') this.isShowCreateShipping = false;
		});

		console.log(this.selectedItems);
	}
	changeSelectionVehicle(e) {
		// if (this.selectedVehicles.length > 0) {
		//   this.isShowCreateShipping = true;
		// } else {
		//   this.isShowCreateShipping = false;
		// }
		// this.selectedVehicles.forEach((s) => {
		//   if (s.Status == 'ShippingAllocated') this.isShowCreateShipping = false;
		// });

		console.log(this.selectedVehicles);
	}
	// #endregion

	// #region SaveChange
	async saveChange() {
		let submitItem = this.getDirtyValues(this.formGroup);
		super.saveChange2();
	}

	saveChangeDetail(fg, index) {
		fg.get('IDOutboundOrder').markAsDirty();
		fg.get('IDItem').markAsDirty();
		fg.get('IDUoM').markAsDirty();
		fg.get('Quantity').markAsDirty();
		fg.get('Id').markAsDirty();
		fg.updateValueAndValidity();
		if (!fg.valid) {
			this.env.showMessage('Please recheck information highlighted in red above', 'warning');
		} else if (this.submitAttempt == false) {
			this.submitAttempt = true;
			let submitItem = this.getDirtyValues(fg);

			this.outboundOrderDetailService
				.save(submitItem, this.pageConfig.isForceCreate)
				.then((savedItem: any) => {
					fg.markAsPristine();
					this.cdr.detectChanges();
					this.submitAttempt = false;
					this.item.OutboundOrderDetails = this.formGroup.controls.OutboundOrderDetails.getRawValue();
					let groups = <FormArray>this.formGroup.controls.OutboundOrderDetails;
					let itemAdjust = this.item.OutboundOrderDetails.find((d) => d.Id == fg.get('Id').value);
					let showingItems = groups.controls.filter((d) => d.get('Showing').value).map((s) => s.get('Id').value);
					let showDetailItems = groups.controls.filter((d) => d.get('ShowDetail').value).map((s) => s.get('Id').value);

					// this.loadedData(null);
					let indexAdjust = 0;
					if (itemAdjust) {
						indexAdjust = this.item.OutboundOrderDetails.indexOf(itemAdjust);
						this.removeItemAndChildren(itemAdjust);
					}
					if (savedItem.length > 0) {
						for (let i = 0; i < savedItem.length; i++) {
							savedItem[i].showdetail = true;
							savedItem[i].show = true;
							if (itemAdjust) {
								this.item.OutboundOrderDetails.splice(i + indexAdjust, 0, savedItem[i]);
							} else this.item.OutboundOrderDetails.push(savedItem[i]);
						}
						this.buildFlatTree(this.item.OutboundOrderDetails, null, false).then((resp: any) => {
							groups.clear();
							this.item.OutboundOrderDetails = resp;
							showingItems.forEach((s) => {
								let i = this.item.OutboundOrderDetails.find((d) => d.Id == s);
								if (i) i.show = true;
							});
							showDetailItems.forEach((s) => {
								let i = this.item.OutboundOrderDetails.find((d) => d.Id == s);
								if (i) i.showdetail = true;
							});
							this.patchFieldsValue();
						});
					}

					this.env.showMessage('Saving completed!', 'success');
				})
				.catch((err) => {
					this.env.showMessage('Cannot save, please try again', 'danger');
					this.cdr.detectChanges();
					this.submitAttempt = false;
				});
		}
		this.saveChange2(fg, null, this.outboundOrderDetailService);
	}
	// #endregion

	// #region Delete
	removeField(fg, j) {
		let groups = <FormArray>this.formGroup.controls.OutboundOrderDetails;
		if (fg.get('Id').value) {
			let itemToDelete = []; //allNest.getRawValue;
			let allNest = this.getAllNested(fg);
			allNest.forEach((i) => {
				itemToDelete.push(i.getRawValue());
			});
			itemToDelete.push(fg.getRawValue());
			this.env.showPrompt('Bạn có chắc muốn xóa không?', null, { code: 'Xóa {{value}} dòng', value: itemToDelete.length }).then((_) => {
				this.outboundOrderDetailService
					.delete(itemToDelete)
					.then((result) => {
						groups.removeAt(j);
						let indexToRemove = this.checkedOutboundOrderDetails.controls.findIndex((control) => control.get('Id').value === fg.get('Id').value);
						this.checkedOutboundOrderDetails.removeAt(indexToRemove);
						allNest.forEach((i) => {
							let index = groups.controls.indexOf(i);
							groups.removeAt(index);
							let indexToRemove = this.checkedOutboundOrderDetails.controls.findIndex((control) => control.get('Id').value === i.get('Id').value);
							this.checkedOutboundOrderDetails.removeAt(indexToRemove);
						});

						this.env.showMessage('saved', 'success');
					})
					.catch((err) => {
						this.env.showMessage(err.error?.Message ?? err.message, 'danger');
					});
			});
		} else {
			groups.removeAt(j);
		}
	}

	delete() {
		if (this.pageConfig.canDelete) {
			let itemsToDelete = this.checkedOutboundOrderDetails.getRawValue();

			this.env
				.showPrompt({ code: 'Bạn có chắc muốn xóa {{value}} đang chọn?', value: { value: itemsToDelete.length } }, null, {
					code: 'Xóa {{value1}} dòng',
					value: { value1: itemsToDelete.length },
				})
				.then((_) => {
					this.env
						.showLoading('Please wait for a few moments', this.outboundOrderDetailService.delete(itemsToDelete))
						.then((_) => {
							this.removeSelectedItems();
							this.env.showMessage('erp.app.app-component.page-bage.delete-complete', 'success');
							this.isAllChecked = false;
						})
						.catch((err) => {
							this.env.showMessage('DELETE_RESULT_FAIL', 'danger');
							console.log(err);
						});
				});
		}
	}
	// #endregion

	// #region Sort
	sortDetail: any = {};
	sortToggle(field) {
		if (!this.sortDetail[field]) {
			this.sortDetail[field] = field;
		} else if (this.sortDetail[field] == field) {
			this.sortDetail[field] = field + '_desc';
		} else {
			delete this.sortDetail[field];
		}
		// let s = Object.keys(sortTerms).reduce(function (res, v) {
		//     return res.concat(sortTerms[v]);
		// }, []);
		if (Object.keys(this.sortDetail).length === 0) {
			const outboundOrderDetailsArray = this.formGroup.get('OutboundOrderDetails') as FormArray;
			this.item.OutboundOrderDetails = outboundOrderDetailsArray.getRawValue();
			outboundOrderDetailsArray.clear();
			this.item.OutboundOrderDetails.sort((a, b) => {
				const comparison = a['Id'] < b['Id'] ? -1 : a['Id'] > b['Id'] ? 1 : 0;
				return comparison;
			});
			this.buildFlatTree(this.item.OutboundOrderDetails, null, false).then((resp: any) => {
				this.item.OutboundOrderDetails = resp;
				this.patchFieldsValue();
			});
		} else {
			this.reInitOutboundOrderDetails();
		}
	}

	reInitOutboundOrderDetails() {
		const outboundOrderDetailsArray = this.formGroup.get('OutboundOrderDetails') as FormArray;
		this.item.OutboundOrderDetails = outboundOrderDetailsArray.getRawValue();
		for (const key in this.sortDetail) {
			if (this.sortDetail.hasOwnProperty(key)) {
				const value = this.sortDetail[key];
				this.sortByKey(value);
			}
		}
		outboundOrderDetailsArray.clear();
		this.buildFlatTree(this.item.OutboundOrderDetails, null, false).then((resp: any) => {
			this.item.OutboundOrderDetails = resp;
			this.patchFieldsValue();
		});
	}

	sortByKey(key: string, desc: boolean = false) {
		if (key.includes('_desc')) {
			key = key.replace('_desc', '');
			desc = true;
		}
		this.item.OutboundOrderDetails.sort((a, b) => {
			const comparison = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
			return desc ? -comparison : comparison;
		});
	}
	// #endregion

	// #region Segment
	refreshSegmentView() {
		let ev: any = {
			detail: {
				value: this.segmentView,
			},
		};
		this.segmentChanged(ev, true);
	}
	segmentView = 's1';
	segmentChanged(ev: any, reload = false) {
		this.segmentView = ev.detail.value;
		if (this.item?.Id > 0) {
			let queryOutbound = {
				IDOutboundOrder: this.item.Id,
			};
			if (this.segmentView == 's2') {
				if (!this.item.PickingList || reload) {
					this.env
						.showLoading('Please wait for a few moments', this.pageProvider.commonService.connect('GET', 'WMS/Picking/', queryOutbound).toPromise())
						.then(async (result: any) => {
							this.item.PickingList = result;
							this.item.PickingList.forEach((i) => {
								i._Status = this.statusList.find((d) => d.Code == i.Status);
							});
						})
						.catch((err) => {
							this.env.showMessage('load error, please try again.');
							console.log(err);
						});
				}
			}
			if (this.segmentView == 's3') {
				if (!this.item.PackingList || reload) {
					this.env
						.showLoading('Please wait for a few moments', this.pageProvider.commonService.connect('GET', 'WMS/Packing/', queryOutbound).toPromise())
						.then(async (result: any) => {
							this.item.PackingList = result;
							this.item.PackingList.forEach((i) => {
								i._Status = this.statusList.find((d) => d.Code == i.Status);
							});
						})
						.catch((err) => {
							this.env.showMessage('load error, please try again.');
							console.log(err);
						});
				}
			}
			if (this.segmentView == 's4') {
				if (!this.item.ShippingList || reload) {
					this.env
						.showLoading('Please wait for a few moments', this.pageProvider.commonService.connect('GET', 'WMS/Shipping/', queryOutbound).toPromise())
						.then(async (result: any) => {
							this.item.ShippingList = result;
							this.item.ShippingList.forEach((i) => {
								i._Status = this.statusList.find((d) => d.Code == i.Status);
							});
						})
						.catch((err) => {
							this.env.showMessage('load error, please try again.');
						});
				}
			}
		}
	}
	// #endregion

	// #region ToggleRow
	toggleRow(fg, event) {
		if (!fg.get('HasChild').value) {
			return;
		}
		event.stopPropagation();
		fg.get('ShowDetail').setValue(!fg.get('ShowDetail').value);
		let groups = <FormArray>this.formGroup.controls.OutboundOrderDetails;
		let subOrders = groups.controls.filter((d) => d.get('IDParent').value == fg.get('Id').value);
		if (fg.get('ShowDetail').value) {
			subOrders.forEach((it) => {
				it.get('Showing').setValue(true);
			});
		} else {
			subOrders.forEach((it) => {
				this.hideSubRows(it);
			});
		}
	}

	hideSubRows(fg) {
		let groups = <FormArray>this.formGroup.controls.OutboundOrderDetails;
		fg.get('Showing').setValue(false);
		if (fg.get('HasChild').value) {
			fg.get('ShowDetail').setValue(false);
			let subOrders = groups.controls.filter((d) => d.get('IDParent').value == fg.get('Id').value);

			subOrders.forEach((it) => {
				this.hideSubRows(it);
				it.get('Showing').setValue(false);
			});
		}
	}
	// #endregion

	markNestedNode(ls, Id) {
		ls.filter((d) => d.IDParent == Id).forEach((i) => {
			if (i.Type == 'Warehouse') i.disabled = false;
			this.markNestedNode(ls, i.Id);
		});
	}
}
