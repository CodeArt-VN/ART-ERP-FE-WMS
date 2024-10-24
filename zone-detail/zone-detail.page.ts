import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, LoadingController, AlertController, PopoverController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { BRA_BranchProvider, WMS_LocationProvider, WMS_ZoneProvider } from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';
import { lib } from 'src/app/services/static/global-functions';

@Component({
  selector: 'app-zone-detail',
  templateUrl: './zone-detail.page.html',
  styleUrls: ['./zone-detail.page.scss'],
})
export class ZoneDetailPage extends PageBase {
  branchList = [];
  locationList = [];

  constructor(
    public pageProvider: WMS_ZoneProvider,
    public branchProvider: BRA_BranchProvider,
    public locationProvider: WMS_LocationProvider,
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
      Code: [{ value: '' }],
      Name: ['', Validators.required],
      Remark: [''],
      Sort: [''],
      IsDisabled: new FormControl({ value: '', disabled: true }),
      MaxPalletsPerItem: [''],
      DefaultPickToLocation: [''],
      InLocation: [''],
      OutLocation: [''],
      IsAllowVoicePicking: [''],
      MaximumPickerOneTime: [''],
      //Assignment Rules tab
      IsCreateAssignments: [''],
      IsZoneBreak: [''],
      MaxPickLines: [''],
      MaxPickContainers: [''],
      MaxCaseCount: [''],
      MaxCube: [''],
      MaxWeight: [''],
      //Exclude from Zone
      IDEquipmentProfile: [''],
    });
  }

  preLoadData(event) {
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
            if(i.Type == 'Warehouse' && i.Id == this.env.selectedBranch) i.disabled = false;
          });
          this.markNestedNode(this.branchList, this.env.selectedBranch);
          super.preLoadData(event);
        });
      });
    this.locationProvider.read({ Skip: 0, Take: 5000, IDZone: this.id }).then((resp) => {
      this.locationList = resp['data'];
    });
  }

  markNestedNode(ls, Id) {
    ls.filter((d) => d.IDParent == Id).forEach((i) => {
      if (i.Type == 'Warehouse') i.disabled = false;
      this.markNestedNode(ls, i.Id);
    });
  }

  segmentView = 's1';
  segmentChanged(ev: any) {
    this.segmentView = ev.detail.value;
  }

  async saveChange() {
    super.saveChange2();
  }
}
