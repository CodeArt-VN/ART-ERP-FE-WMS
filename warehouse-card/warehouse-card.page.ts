import { Component, Input } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { CRM_ContactProvider, WMS_ItemGroupProvider, WMS_ItemProvider, WMS_TransactionProvider } from 'src/app/services/static/services.service';
import QRCode from 'qrcode';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';

@Component({
    selector: 'app-warehouse-card',
    templateUrl: 'warehouse-card.page.html',
    styleUrls: ['warehouse-card.page.scss'],
    standalone: false
})
export class WarehouseCardPage extends PageBase {
  currentDate = new Date();
  selectedBranch;
  storerList;
  branchList;
  printMode = 'Ruy96';
  sheets=[];
  totalItem : any = {};
  firstItem:any = {};
  constructor(
    //public pageProvider: WMS_WarehouseCardProvider,
    public pageProvider: WMS_TransactionProvider,
    public itemProvider: WMS_ItemProvider,
    public contactProvider: CRM_ContactProvider,
    public modalController: ModalController,
    public popoverCtrl: PopoverController,
    public alertCtrl: AlertController,
    public loadingController: LoadingController,
    public env: EnvService,
    public navCtrl: NavController,
    public route: ActivatedRoute,
    public router: Router,
    public formBuilder: FormBuilder,
    
  ) {
    super();
    this.pageConfig.isShowFeature = true;
    this.pageConfig.isDetailPage = true;
    this.formGroup = this.formBuilder.group({
      IDItem:['',Validators.required],
      IDBranch:['',Validators.required],
      IDStorer:[''],
      TransactionDateFrom:[this.dateMinusMonths(3),Validators.required],
      TransactionDateTo:[this.getCurrentDate(),Validators.required],
      _IDItemDataSource:this.buildSelectDataSource((term) => {
        return this.itemProvider.search({ 
           SortBy: ['Id_desc'],Take: 200, Skip: 0, Term: term });
      }),
    });
    // this.formGroup.get('IDBranch').setValue(1005);
    // this.formGroup.get('IDItem').setValue(61843);

  }

  preLoadData(event?: any): void {
    this.route.queryParams.subscribe((params) => {
      if(this.router.getCurrentNavigation()?.extras.state){
        this.formGroup.patchValue(this.router.getCurrentNavigation()?.extras.state.query);
        
        this.formGroup.get('_IDItemDataSource').value.selected.push(this.router.getCurrentNavigation().extras.state.Item);
        this.formGroup.get('_IDItemDataSource').value.initSearch();
        this.patchValue(this.router.getCurrentNavigation()?.extras.state.items);
        this.fromDate = this.query.TransactionDateFrom;
        this.toDate = this.query.TransactionDateTo;
        // if(this.formGroup.valid)  this.changeFilter();
        // this.formGroup.get('IDBranch').setValue(this.router.getCurrentNavigation().extras.state.IDBranch);
        // this.formGroup.get('IDItem').setValue(this.router.getCurrentNavigation().extras.state.Item?.Id);
      };
      this.loadedData(event);
    });
    this.branchList = [...this.env.branchList];
    this.contactProvider.read({ IsStorer: true }).then((resp) => {
      this.storerList = resp['data'];
    });
  }

  loadedData(event?: any, ignoredFromGroup?: boolean): void {
    super.loadedData(event, ignoredFromGroup);
   
    this.formGroup.get('_IDItemDataSource').value.initSearch();
    this.formGroup.enable();
    if(!this.formGroup.get('IDBranch').value){
      this.getNearestWarehouse(this.env.selectedBranch);
    }
  }
  fromDate;
  toDate;
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
    this.query = this.formGroup.getRawValue();
    this.fromDate = this.query.TransactionDateFrom;
    this.toDate = this.query.TransactionDateTo;
    delete this.query._IDItemDataSource;
    this.pageConfig.isEndOfData = false;
    this.currentDate = new Date();
    this.item={};
    this.env.showLoading('Please wait for a few moments',this.pageProvider.read(this.query)).then((res:any) => {
      if (res && res.data?.length > 0) {
        // Filter data
        this.patchValue(res.data);
    }
      
    }).catch(err=>{
      this.env.showMessage(err.error?.InnerException?.ExceptionMessage || err,'danger')
    });
  }
  patchValue(data){
    this.item={};
//    this.sheets = [];
    this.totalItem = data[data.length-1];
    this.firstItem = data[0];
    this.firstItem.SplitOpeningQuantity = this.firstItem._SplitOpeningQuantity
    .map(s=> s.Quantity+' '+s.UoMName).join(this.firstItem.OpeningQuantity<0? ' - ' : ' + ');
    this.item.data = [...data
    .filter(i => (!i._FromLocation && i._ToLocation) || (i._FromLocation && !i._ToLocation))
    .sort((a, b) => new Date(a.TransactionDate).getTime() - new Date(b.TransactionDate).getTime()).map(i => ({ ...i }))]
        // Initialize sheets
      
        if(this.item.data?.length>0){
          this.item._Branch = this.item.data[0]._Branch;
        }else this.item._Branch = this.env.branchList.find(x => x.Id == this.formGroup.get('IDBranch').value);
      
        // Assign other properties
        this.item._Item = this.item.data[0]._Item;
        this.item.Id = this.formGroup.get('IDItem').value;
        QRCode.toDataURL(
          'Id:' + this.item.Id,
          {
            errorCorrectionLevel: 'H',
            version: 2,
            width: 500,
            scale: 20,
            type: 'image/webp',
          },
          (err, url) => { // Use arrow function here
            if (!err) {
              this.item.QRC = url;
            } else {
              console.error('QR Code Generation Error:', err);
            }
          }
        );
  }
  getContinuousIndex(sheetIndex: number, rowIndex: number): number {
    let previousCount = 0;
    // Sum up the number of items from all previous sheets
    for (let i = 0; i < sheetIndex; i++) {
      previousCount += this.sheets[i]?.data.length || 0;
    }
    return previousCount + rowIndex + 1;
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
    dateMinusMonths(months: number): string {
      const date = new Date();
      date.setMonth(date.getMonth() - months);
      return date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    }
    
    getCurrentDate(): string {
      console.log('getnewdate');
      return new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    }
}
