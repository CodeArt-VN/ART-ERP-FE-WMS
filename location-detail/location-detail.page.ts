import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, LoadingController, AlertController, PopoverController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import {
  BRA_BranchProvider,
  SYS_TypeProvider,
  WMS_LocationProvider,
  WMS_ZoneProvider,
} from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';

@Component({
  selector: 'app-location-detail',
  templateUrl: './location-detail.page.html',
  styleUrls: ['./location-detail.page.scss'],
})
export class LocationDetailPage extends PageBase {
  constructor(
    public pageProvider: WMS_LocationProvider,
    public zoneProvider: WMS_ZoneProvider,
    public typeProvider: SYS_TypeProvider,
    public branchProvider: BRA_BranchProvider,
    public popoverCtrl: PopoverController,
    public env: EnvService,
    public navCtrl: NavController,
    public route: ActivatedRoute,
    public alertCtrl: AlertController,
    public formBuilder: FormBuilder,
    public cdr: ChangeDetectorRef,
    public loadingController: LoadingController,
    public commonService: CommonService,
  ) {
    super();
    this.pageConfig.isDetailPage = true;

    this.formGroup = formBuilder.group({
      IDBranch: ['', Validators.required],
      Id: new FormControl({ value: '', disabled: true }),
      Code: [''],
      Name: ['', Validators.required],
      Remark: [''],
      Sort: [''],
      IsDisabled: new FormControl({ value: '', disabled: true }),
      IDZone: ['', Validators.required],
      LocationType: [''],
      IsAutomaticallyShipPickedProduct: [''],
      IsLoseID: [''],
      RouteSequence: [''],
      IsCommingleItem: [''],
      IsCommingleLot: [''],
      Length: [''],
      Width: [''],
      Height: [''],
      LocationFlag: ['', Validators.required],
      FootPrint: [''],
      StackLimit: [''],
      CubicCapacity: [''],
      LocationHandling: ['', Validators.required],
      Level: [''],
      WeightCapacity: [''],
      XCoordinate: [''],
      YCoordinate: [''],
      ZCoordinate: [''],
      Orientation: [''],

      MoverType: [''],
      LocationCategory: [''],
    });
  }

  zoneList = [];
  locationTypeList = [];
  locationFlagList = [];
  locationHandlingList = [];
  preLoadData() {
    this.typeProvider.read({ Code: 'LocationTypeGroup', AllChildren: true }).then((resp) => {
      let locationType = resp['data'].find((d) => d.Code == 'LocationType');
      if (locationType) this.locationTypeList = resp['data'].filter((d) => d.IDParent == locationType.Id);

      let locationFlag = resp['data'].find((d) => d.Code == 'LocationFlag');
      if (locationFlag) this.locationFlagList = resp['data'].filter((d) => d.IDParent == locationFlag.Id);

      let locationHandling = resp['data'].find((d) => d.Code == 'LocationHandling');
      if (locationHandling) this.locationHandlingList = resp['data'].filter((d) => d.IDParent == locationHandling.Id);
    });
    this.zoneProvider.read().then((resp) => {
      this.zoneList = resp['data'];
      super.preLoadData();
    });
  }

  segmentView = 's1';
  segmentChanged(ev: any) {
    this.segmentView = ev.detail.value;
  }

  changedIDZone(e) {
    if (e) {
      this.formGroup.controls.IDBranch.setValue(e.IDBranch);
      this.formGroup.controls.IDBranch.markAsDirty();
    }
    this.saveChange();
  }

  async saveChange() {
    super.saveChange2();
  }
}
