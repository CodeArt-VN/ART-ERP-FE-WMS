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
      CreatedDateFrom:[''],
      CreatedDateTo:[''],
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
      if(this.router.getCurrentNavigation()?.extras.state?.IDBranch && this.router.getCurrentNavigation()?.extras.state?.Item){
        this.formGroup.get('IDBranch').setValue(this.router.getCurrentNavigation().extras.state.IDBranch);
        this.formGroup.get('IDItem').setValue(this.router.getCurrentNavigation().extras.state.Item?.Id);
        this.formGroup.get('_IDItemDataSource').value.selected.push(this.router.getCurrentNavigation().extras.state.Item);
        this.formGroup.get('_IDItemDataSource').value.initSearch();
        this.changeFilter();
      };

      console.log(params);
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
  }

  changeFilter() {
    if(this.formGroup.invalid) return;
    if((this.formGroup.controls.CreatedDateFrom.value && !this.formGroup.controls.CreatedDateTo.value)
      || (!this.formGroup.controls.CreatedDateFrom.value && this.formGroup.controls.CreatedDateTo.value)) {
      this.env.showMessage('Please select both From and To date');
      return;
    }
    this.item={};
    this.sheets = [];
    this.query = this.formGroup.getRawValue();
    this.query.SplitUoM = true;
    delete this.query._IDItemDataSource;
    this.pageConfig.isEndOfData = false;
    this.env.showLoading('Please wait for a few moments',this.pageProvider.read(this.query)).then((res:any) => {
      if (res && res.data?.length > 0) {
        // Filter data
        this.item.data = res.data.filter(i => (!i._FromLocation && i._ToLocation) || (i._FromLocation && !i._ToLocation));
    
        // Initialize sheets
        let currentSheet = { data: [] };//,TotalInput:0,TotalOutput:0,TotalOpenQuantity:0
        let splitCount = 0;
        
        if(this.item.data?.length>0){
          this.item._Branch = this.item.data[0]._Branch;
        }else this.item._Branch = this.env.branchList.find(x => x.Id == this.formGroup.get('IDBranch').value);
        for (let i of this.item.data) {
            let itemSplitCount =  i._SplitQuantity?.length > i._SplitOpeningStock?.length? i._SplitQuantity?.length : i._SplitOpeningStock?.length;

            if (splitCount + itemSplitCount > 40) {
                // Start a new sheet if adding this item exceeds 40 SplitQuantity
                this.sheets.push(currentSheet);
                currentSheet = { data: [] };
                splitCount = 0;
            }
            
            currentSheet.data.push(i);
            splitCount += itemSplitCount;
        }
    
        // Push the last sheet if it has data
        if (currentSheet.data.length > 0) {
            // currentSheet.TotalInput = currentSheet.data.filter(d=> !d.FromLocation && d.ToLocation).reduce((acc,v)=> +acc+v,0);
            // currentSheet.TotalOutput = currentSheet.data.filter(d=> d.FromLocation && !d.ToLocation).reduce((acc,v)=> +acc+v,0);
            // currentSheet.TotalOpenQuantity = currentSheet.data.filter(d=> d.FromLocation && !d.ToLocation).reduce((acc,v)=> +acc+v,0);
            this.sheets.push(currentSheet);
        }
        
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
    });
  }
  getContinuousIndex(sheetIndex: number, rowIndex: number): number {
    let previousCount = 0;
    
    // Sum up the number of items from all previous sheets
    for (let i = 0; i < sheetIndex; i++) {
      previousCount += this.sheets[i]?.data.length || 0;
    }
    
    return previousCount + rowIndex + 1;
  }
}
