import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import {
  BRA_BranchProvider,
  SALE_OrderProvider,
  SHIP_ShipmentProvider,
} from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { lib } from 'src/app/services/static/global-functions';
import QRCode from 'qrcode';

@Component({
  selector: 'app-returned-list',
  templateUrl: 'returned-list.page.html',
  styleUrls: ['returned-list.page.scss'],
})
export class ReturnedLlistPage extends PageBase {
  warehouses = [];
  canRecieve = false;
  ngayIn = '';

  constructor(
    public pageProvider: SHIP_ShipmentProvider,
    public branchProvider: BRA_BranchProvider,
    public modalController: ModalController,
    public alertCtrl: AlertController,
    public loadingController: LoadingController,
    public env: EnvService,
    public navCtrl: NavController,
    public location: Location,
  ) {
    super();
    this.pageConfig.isShowFeature = true;

    let today = new Date();
    this.ngayIn = lib.dateFormat(today, 'dd/mm/yy hh:MM');
    //this.query.DeliveryDate = lib.dateFormat(today.setDate(today.getDate() + 1), 'yyyy-mm-dd');
    this.query.IDStatus = '[306]';
  }

  loadData(event) {
    this.pageProvider.apiPath.getList.url = function () {
      return ApiSetting.apiDomain('SHIP/Shipment/List');
    };
    super.loadData(event);
  }

  loadedData(event) {
    this.items.forEach((i) => {
      i.DeliveryDateText = lib.dateFormat(i.DeliveryDate, 'dd/mm/yy hh:MM');
      i.DeliveryTimeText = lib.dateFormat(i.DeliveryDate, 'hh:MM');
    });
    super.loadedData(event);
  }

  sheets: any = [];
  loadReturnedLlist() {
    this.canRecieve = false;
    let selected = this.items.filter((d) => d.isChecked).map((m) => m.Id);

    if (!selected.length) {
      this.env.showTranslateMessage('Please select trucks to pick up', 'warning');
      return;
    }

    if (this.submitAttempt) {
      this.env.showTranslateMessage('Please wait for creating lists');
      return;
    }

    let docQuery: any = {
      Id: JSON.stringify(selected),
      IgnoredBranch: true,
    };

    this.submitAttempt = true;

    let apiPath = {
      method: 'GET',
      url: function () {
        return ApiSetting.apiDomain('SHIP/Shipment/ShipmentReview');
      },
    };

    this.loadingController
      .create({
        cssClass: 'my-custom-class',
        message: 'Đang tạo bảng kê, xin vui lòng chờ giây lát...',
      })
      .then((loading) => {
        loading.present();

        this.pageProvider.commonService
          .connect(apiPath.method, apiPath.url(), docQuery)
          .toPromise()
          .then((resp: any) => {
            this.warehouses = [];
            let checkCanRecieve = resp.length > 0;
            for (let si = 0; si < resp.length; si++) {
              const s = resp[si];
              if (s.Status.Id != 306) {
                checkCanRecieve = false;
              }
              let itemList = [];
              let warehouse = this.warehouses.find((d) => d.Id == s.WarehouseId);
              if (!warehouse) {
                warehouse = {
                  Id: s.WarehouseId,
                  Name: s.WarehouseName,
                  Phone: s.WarehousePhone,
                  count: 1,
                  itemList: [],
                };
                this.warehouses.push(warehouse);
              } else {
                warehouse.count++;
              }

              s.DeliveryDateText = lib.dateFormat(s.DeliveryDate, 'dd/mm/yy hh:MM');

              for (let i = 0; i < s.ShipmentOrder.length; i++) {
                const o = s.ShipmentOrder[i];

                for (let j = 0; j < o.SaleOrder.OrderLines.length; j++) {
                  const l = o.SaleOrder.OrderLines[j];

                  let findItem = itemList.find((d) => d.IDItem == l.IDItem);
                  if (!findItem) {
                    findItem = {
                      IDItem: l.IDItem,
                      ItemCode: l.ItemCode,
                      ItemName: l.ItemName,
                      IDInventoryUoM: l.IDInventoryUoM,
                      InventoryUoMBaseQuantity: l.InventoryUoMBaseQuantity,
                      UoMs: [],
                    };
                    itemList.push(findItem);
                  }

                  let uom = null;
                  if (l.IsBaseUoM || l.IDInventoryUoM == l.IDUoM) {
                    uom = findItem.UoMs.find((d) => d.IDUoM == 0);
                    if (!uom) {
                      uom = {
                        IDUoM: 0,
                        BaseQuantity: 0,
                        InventoryQuantity: 0,
                      };
                      findItem.UoMs.push(uom);
                    }

                    if (l.IsBaseUoM) {
                      uom.BaseQuantity += l.Quantity - l.ShippedQuantity;
                    } else {
                      uom.InventoryQuantity += l.Quantity - l.ShippedQuantity;
                    }

                    if (
                      uom.BaseQuantity >= findItem.InventoryUoMBaseQuantity &&
                      findItem.InventoryUoMBaseQuantity > 0
                    ) {
                      uom.InventoryQuantity +=
                        (uom.BaseQuantity - (uom.BaseQuantity % findItem.InventoryUoMBaseQuantity)) /
                        findItem.InventoryUoMBaseQuantity;
                      uom.BaseQuantity = uom.BaseQuantity % findItem.InventoryUoMBaseQuantity;
                    }
                  } else {
                    uom = findItem.UoMs.find((d) => d.IDUoM == l.IDUoM);
                    if (!uom) {
                      uom = {
                        IDUoM: l.IDUoM,
                        UoMName: l.UoMName,
                        Quantity: 0,
                      };

                      findItem.UoMs.push(uom);
                    }

                    uom.Quantity += l.Quantity - l.ShippedQuantity;
                  }

                  let findWarehoseItem = warehouse.itemList.find((d) => d.IDItem == l.IDItem);
                  if (!findWarehoseItem) {
                    findWarehoseItem = {
                      IDItem: l.IDItem,
                      ItemCode: l.ItemCode,
                      ItemName: l.ItemName,
                      IDInventoryUoM: l.IDInventoryUoM,
                      InventoryUoMBaseQuantity: l.InventoryUoMBaseQuantity,
                      UoMs: [],
                    };
                    warehouse.itemList.push(findWarehoseItem);
                  }

                  let warehouseUOM = null;
                  if (l.IsBaseUoM || l.IDInventoryUoM == l.IDUoM) {
                    warehouseUOM = findWarehoseItem.UoMs.find((d) => d.IDUoM == 0);
                    if (!warehouseUOM) {
                      warehouseUOM = {
                        IDUoM: 0,
                        BaseQuantity: 0,
                        InventoryQuantity: 0,
                      };
                      findWarehoseItem.UoMs.push(warehouseUOM);
                    }

                    if (l.IsBaseUoM) {
                      warehouseUOM.BaseQuantity += l.Quantity - l.ShippedQuantity;
                    } else {
                      warehouseUOM.InventoryQuantity += l.Quantity - l.ShippedQuantity;
                    }

                    if (
                      warehouseUOM.BaseQuantity >= findWarehoseItem.InventoryUoMBaseQuantity &&
                      findWarehoseItem.InventoryUoMBaseQuantity > 0
                    ) {
                      warehouseUOM.InventoryQuantity +=
                        (warehouseUOM.BaseQuantity -
                          (warehouseUOM.BaseQuantity % findWarehoseItem.InventoryUoMBaseQuantity)) /
                        findWarehoseItem.InventoryUoMBaseQuantity;
                      warehouseUOM.BaseQuantity = warehouseUOM.BaseQuantity % findWarehoseItem.InventoryUoMBaseQuantity;
                    }
                  } else {
                    warehouseUOM = findWarehoseItem.UoMs.find((d) => d.IDUoM == l.IDUoM);
                    if (!warehouseUOM) {
                      warehouseUOM = {
                        IDUoM: l.IDUoM,
                        UoMName: l.UoMName,
                        Quantity: 0,
                      };

                      findWarehoseItem.UoMs.push(warehouseUOM);
                    }

                    warehouseUOM.Quantity += l.Quantity - l.ShippedQuantity;
                  }
                }
              }

              s.Items = itemList
                .filter(
                  (d) =>
                    d.UoMs.findIndex((s) => s.IDUoM == 0 && (s.BaseQuantity > 0 || s.InventoryQuantity > 0)) > -1 ||
                    d.UoMs.findIndex((s) => s.IDUoM != 0 && s.Quantity > 0) > -1,
                )
                .sort((a, b) => parseFloat(b.IDItem) - parseFloat(a.IDItem));

              warehouse.itemList = warehouse.itemList
                .filter(
                  (d) =>
                    d.UoMs.findIndex((s) => s.IDUoM == 0 && (s.BaseQuantity > 0 || s.InventoryQuantity > 0)) > -1 ||
                    d.UoMs.findIndex((s) => s.IDUoM != 0 && s.Quantity > 0) > -1,
                )
                .sort((a, b) => parseFloat(b.IDItem) - parseFloat(a.IDItem));
            }

            this.sheets = resp;
            this.canRecieve = checkCanRecieve;
            this.submitAttempt = false;
            if (loading) loading.dismiss();
          })
          .catch((err) => {
            if (err.message != null) {
              this.env.showMessage(err.message, 'danger');
            } else {
              this.env.showTranslateMessage('Cannot create pick - up list', 'danger');
            }
            this.submitAttempt = false;
            if (loading) loading.dismiss();
          });
      });
  }

  toggleDateFilter() {
    this.query.IDStatus = this.query.IDStatus == '[306]' ? '[306,329,328]' : '[306]';
    if (this.query.IDStatus == '[306]') {
      this.query.DeliveryDate = '';
    } else {
      let today = new Date();
      this.query.DeliveryDate = lib.dateFormat(today.setDate(today.getDate()), 'yyyy-mm-dd');
    }
    this.sheets = [];
    this.warehouses = [];
    this.refresh();
  }

  confirmInboundReturn() {
    let selected = this.items.filter((d) => d.isChecked).map((m) => m.Id);
    let ids = JSON.stringify(selected);
    this.submitAttempt = true;

    let apiPath = {
      method: 'POST',
      url: function (ids) {
        return ApiSetting.apiDomain('SHIP/Shipment/ConfirmInboundReturn/' + ids);
      },
    };
    this.pageProvider.commonService
      .connect(apiPath.method, apiPath.url(ids), this.query)
      .toPromise()
      .then((resp: any) => {
        this.env.showTranslateMessage('Returned goods inbound confirmed', 'success');
        this.sheets = [];
        this.refresh();
        this.submitAttempt = false;
      })
      .catch((err) => {
        if (err.message != null) {
          this.env.showMessage(err.message, 'danger');
        } else {
          this.env.showTranslateMessage('Cannote create list', 'danger');
        }
        this.refresh();
        this.submitAttempt = false;
      });
  }
}
