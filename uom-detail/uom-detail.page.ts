import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, LoadingController, AlertController, ModalController, NavParams } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { WMS_UoMProvider } from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl } from '@angular/forms';

@Component({
    selector: 'app-uom-detail',
    templateUrl: './uom-detail.page.html',
    styleUrls: ['./uom-detail.page.scss'],
    standalone: false
})
export class UoMDetailPage extends PageBase {
  typeList = [{ Name: 'Each' }, { Name: 'Innerpack' }, { Name: 'Case' }, { Name: 'Pallet' }];
  constructor(
    public pageProvider: WMS_UoMProvider,
    public env: EnvService,
    public navCtrl: NavController,
    public route: ActivatedRoute,
    public modalController: ModalController,
    public alertCtrl: AlertController,
    public navParams: NavParams,
    public formBuilder: FormBuilder,
    public cdr: ChangeDetectorRef,
    public loadingController: LoadingController,
  ) {
    super();
    this.pageConfig.forceLoadData = true;
    this.pageConfig.isDetailPage = true;
    this.pageConfig.isForceCreate = true;
    this.id = this.route.snapshot.paramMap.get('id');
    this.formGroup = formBuilder.group({
      IDBranch: [this.env.selectedBranch],
      Id: new FormControl({ value: '', disabled: true }),
      Code: [''],
      Name: ['', Validators.required],
      Type: ['', Validators.required],
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

  preLoadData() {
    if (this.navParams) {
      this.item = JSON.parse(JSON.stringify(this.navParams.data.item));
      this.id = this.navParams.data.id;
      this.cdr.detectChanges();
      super.loadedData();
    }
  }

  refresh() {
    this.preLoadData();
  }

  async saveChange() {
    super.saveChange2();
  }
}
