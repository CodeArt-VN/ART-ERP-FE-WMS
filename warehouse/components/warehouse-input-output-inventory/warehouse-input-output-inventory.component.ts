import { Component, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, FormArray } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AlertController, LoadingController, NavController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { CommonService } from 'src/app/services/core/common.service';
import { EnvService } from 'src/app/services/core/env.service';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { lib } from 'src/app/services/static/global-functions';

@Component({
  selector: 'app-warehouse-input-output-inventory',
  templateUrl: './warehouse-input-output-inventory.component.html',
  styleUrls: ['./warehouse-input-output-inventory.component.scss'],
})
export class WarehouseInputOutputInventoryComponent extends PageBase {
  @Input() set setQuery(value) {
    this.query = value ? value : {};
    this.query.ToLocation = this.query.IDLocation;
    if (this.query.CreatedDateTo) {
      this.query.CreatedDateTo += 'T23:59:59'
    }
    this.clearData();
    this.loadData(null);
  };

  constructor(
    public pageProvider: CommonService,
    public env: EnvService,
    public route: ActivatedRoute,
    public alertCtrl: AlertController,
    public navCtrl: NavController,
    public formBuilder: FormBuilder,
    public cdr: ChangeDetectorRef,
    public loadingController: LoadingController,
  ) {
    super();
  }

  preLoadData(event) { }

  loadData(event) {
    let apiPath = {
      method: "GET",
      url: function () { return ApiSetting.apiDomain("WMS/Transaction/InputOutputInventory/") }
    };

    if (this.pageConfig.isDetailPage) {
      this.loadAnItem(event);
    }
    else {
      if (this.pageProvider && !this.pageConfig.isEndOfData) {
        if (event == 'search') {
          this.pageProvider.connect(apiPath.method, apiPath.url(), this.query).toPromise().then((result: any) => {
            if (result.length == 0 || result.length < this.query.Take) {
              this.pageConfig.isEndOfData = true;
            }
            this.items = result;
            this.loadedData(null);
          });
        }
        else {
          this.query.Skip = this.items.length;
          this.pageProvider.connect(apiPath.method, apiPath.url(), this.query).toPromise().then((result: any) => {
            if (result.length == 0 || result.length < this.query.Take) {
              this.pageConfig.isEndOfData = true;
            }
            if (result.length > 0) {
              let firstRow = result[0];

              //Fix dupplicate rows
              //if (this.items.findIndex(d => d.Id == firstRow.Id) == -1) {
                this.items = [...this.items, ...result];
              //}
            }

            this.loadedData(event);
          });
        }

      }
      else {
        this.loadedData(event);
      }
    }

  }



  loadedData(event) {
    this.items.forEach(i => {

      i.OpenQuantity = lib.formatMoney(i.OpenQuantity, 0);
      i.OpenCube = lib.formatMoney(i.OpenCube / 1000000, 3);
      i.OpenGrossWeight = lib.formatMoney(i.OpenGrossWeight / 1000, 3);
      i.OpenNetWeight = lib.formatMoney(i.OpenNetWeight / 1000, 3);

      i.InputQuantity = lib.formatMoney(i.InputQuantity, 0);
      i.InputCube = lib.formatMoney(i.InputCube / 1000000, 3);
      i.InputGrossWeight = lib.formatMoney(i.InputGrossWeight / 1000, 3);
      i.InputNetWeight = lib.formatMoney(i.InputNetWeight / 1000, 3);

      i.OutputQuantity = lib.formatMoney(i.OutputQuantity, 0);
      i.OutputCube = lib.formatMoney(i.OutputCube / 1000000, 3);
      i.OutputGrossWeight = lib.formatMoney(i.OutputGrossWeight / 1000, 3);
      i.OutputNetWeight = lib.formatMoney(i.OutputNetWeight / 1000, 3);

      i.CloseQuantity = lib.formatMoney(i.CloseQuantity, 0);
      i.CloseCube = lib.formatMoney(i.CloseCube / 1000000, 3);
      i.CloseGrossWeight = lib.formatMoney(i.CloseGrossWeight / 1000, 3);
      i.CloseNetWeight = lib.formatMoney(i.CloseNetWeight / 1000, 3);


    });
    super.loadedData(event);
  }
}

//SaleProductReport

