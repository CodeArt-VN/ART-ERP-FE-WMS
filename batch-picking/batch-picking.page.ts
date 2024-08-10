import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import {
  BRA_BranchProvider,
  SALE_OrderProvider,
  SHIP_ShipmentProvider,
  WMS_OutboundOrderProvider,
} from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { lib } from 'src/app/services/static/global-functions';
import QRCode from 'qrcode';

@Component({
  selector: 'app-batch-picking',
  templateUrl: 'batch-picking.page.html',
  styleUrls: ['batch-picking.page.scss'],
})
export class BatchPickingPage extends PageBase {
  warehouses = [];
  ngayIn = '';

  constructor(
    public pageProvider: SHIP_ShipmentProvider,
    public outboundProvider: WMS_OutboundOrderProvider,
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
    this.query.IDStatus = '[301]';
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
  loadBatchPicking() {
    if (this.submitAttempt) {
      this.env.showMessage('Please wait for a few moments');
      return;
    }

    let selected = this.selectedItems.map((m) => m.Id);
    if (!selected.length) {
      this.env.showMessage('Please wait for a few moments', 'warning');
      return;
    }

    let docQuery: any = {
      Id: JSON.stringify(selected),
      CreateOutbound: true
    };

    let apiPath = {
      method: 'GET',
      url: function () {
        return ApiSetting.apiDomain('SHIP/Shipment/PickingList2');
      },
    };

    this.loadingController
      .create({
        cssClass: 'my-custom-class',
        message: 'Please wait for a few moments',
      })
      .then((loading) => {
        loading.present();
        this.submitAttempt = true;
        this.pageProvider.commonService
          .connect(apiPath.method, apiPath.url(), docQuery)
          .toPromise()
          .then((resp: any) => {
            this.sheets = resp;
            this.warehouses = [];

            for (let si = 0; si < this.sheets.length; si++) {
              const s = this.sheets[si];
              let itemList = [];
              s.DeliveryDateText = lib.dateFormat(s.DeliveryDate, 'dd/mm/yy hh:MM');
              s.NumberOfOrders = 0;
              // s.TotalOrders = 0;
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

              for (let i = 0; i < s.Customers.length; i++) {
                const c = s.Customers[i];

                for (let j = 0; j < c.Orders.length; j++) {
                  const o = c.Orders[j];

                  s.NumberOfOrders++;

                  o.STT = s.NumberOfOrders;
                  s.TotalOrders += o.OriginalTotalAfterTax;

                  o.OrderLines.forEach((l) => {
                    if (l.Item.InventoryUoM == null) {
                      l.Item.InventoryUoM = {
                        BaseQuantity: 1,
                        AlternativeQuantity: 1,
                      };
                    }

                    let findItem = itemList.find((d) => d.IDItem == l.IDItem);
                    if (!findItem) {
                      findItem = {
                        IDItem: l.IDItem,
                        ItemCode: l.Item.Code,
                        ItemName: l.Item.Name,

                        ItemGroupName: l.ItemGroupName,
                        ItemSort: (l.ItemSort ? l.ItemSort : 999) + (l.ItemGroupSort ? l.ItemGroupSort : 9999) * 1000,

                        UoMs: [],
                      };
                      itemList.push(findItem);
                    }

                    let calcUom = findItem.UoMs.find((d) => d.IDUoM == 0);
                    if (!calcUom) {
                      calcUom = {
                        IDUoM: 0,
                        BaseQuantity: 0,
                        InventoryQuantity: 0,
                      };
                      findItem.UoMs.push(calcUom);
                    }

                    if (l.Item.UoM.Id == l.Item.BaseUoM.Id || l.Item.UoM.Id == l.Item.InventoryUoM.Id) {
                      if (l.Item.UoM.Id == l.Item.BaseUoM.Id) {
                        calcUom.BaseQuantity += l.Quantity;
                      } else {
                        calcUom.InventoryQuantity += l.Quantity;
                      }

                      if (
                        calcUom.BaseQuantity >= findItem.InventoryUoMBaseQuantity &&
                        findItem.InventoryUoMBaseQuantity > 0
                      ) {
                        calcUom.InventoryQuantity +=
                          (calcUom.BaseQuantity - (calcUom.BaseQuantity % findItem.InventoryUoMBaseQuantity)) /
                          findItem.InventoryUoMBaseQuantity;
                        calcUom.BaseQuantity = calcUom.BaseQuantity % findItem.InventoryUoMBaseQuantity;
                      }

                      let qdThung = parseInt(
                        (
                          (calcUom.BaseQuantity * l.Item.InventoryUoM.AlternativeQuantity) /
                          l.Item.InventoryUoM.BaseQuantity
                        ).toString(),
                      );
                      if (qdThung > 0) {
                        calcUom.InventoryQuantity += qdThung;
                        calcUom.BaseQuantity =
                          calcUom.BaseQuantity -
                          (qdThung * l.Item.InventoryUoM.BaseQuantity) / l.Item.InventoryUoM.AlternativeQuantity;
                      }
                    } else {
                      let uom = findItem.UoMs.find((d) => d.IDUoM == l.Item.UoM.Id);
                      if (!uom) {
                        uom = {
                          IDUoM: l.Item.UoM.Id,
                          UoMName: l.Item.UoM.Name,
                          Quantity: 0,
                        };

                        findItem.UoMs.push(uom);
                      }
                      uom.Quantity += l.Quantity;

                      let tongLeQty = (uom.Quantity * l.Item.UoM.BaseQuantity) / l.Item.UoM.AlternativeQuantity;
                      let qdThung = parseInt(
                        (
                          (tongLeQty * l.Item.InventoryUoM.AlternativeQuantity) /
                          l.Item.InventoryUoM.BaseQuantity
                        ).toString(),
                      );

                      if (qdThung > 0) {
                        calcUom.InventoryQuantity += qdThung;
                        let leConLai =
                          tongLeQty -
                          (qdThung * l.Item.InventoryUoM.BaseQuantity) / l.Item.InventoryUoM.AlternativeQuantity;

                        let uomLe = (leConLai * l.Item.UoM.AlternativeQuantity) / l.Item.UoM.BaseQuantity;
                        uom.Quantity = uomLe;
                      }

                      let qdLe = parseInt(
                        ((uom.Quantity * l.Item.UoM.BaseQuantity) / l.Item.UoM.AlternativeQuantity).toString(),
                      );
                      if (qdLe > 0 && l.Item.UoM.BaseQuantity < l.Item.UoM.AlternativeQuantity) {
                        calcUom.BaseQuantity += qdLe;
                        uom.Quantity = uom.Quantity - (qdLe * l.Item.UoM.AlternativeQuantity) / l.Item.UoM.BaseQuantity;
                      }

                      if (uom.Quantity == 0) {
                        const index = findItem.UoMs.indexOf(uom);
                        if (index > -1) {
                          findItem.UoMs.splice(index, 1);
                        }
                      }

                      qdThung = parseInt(
                        (
                          (calcUom.BaseQuantity * l.Item.InventoryUoM.AlternativeQuantity) /
                          l.Item.InventoryUoM.BaseQuantity
                        ).toString(),
                      );
                      if (qdThung > 0) {
                        calcUom.InventoryQuantity += qdThung;
                        calcUom.BaseQuantity =
                          calcUom.BaseQuantity -
                          (qdThung * l.Item.InventoryUoM.BaseQuantity) / l.Item.InventoryUoM.AlternativeQuantity;
                      }
                    }

                    if (calcUom.BaseQuantity == 0 && calcUom.InventoryQuantity == 0) {
                      const index = findItem.UoMs.indexOf(calcUom);
                      if (index > -1) {
                        findItem.UoMs.splice(index, 1);
                      }
                    }

                    let findWarehoseItem = warehouse.itemList.find((d) => d.IDItem == l.IDItem);
                    if (!findWarehoseItem) {
                      findWarehoseItem = {
                        IDItem: l.IDItem,
                        ItemCode: l.Item.Code,
                        ItemName: l.Item.Name,

                        ItemGroupName: l.ItemGroupName,
                        ItemSort: (l.ItemSort ? l.ItemSort : 999) + (l.ItemGroupSort ? l.ItemGroupSort : 9999) * 1000,

                        UoMs: [],
                      };
                      warehouse.itemList.push(findWarehoseItem);
                    }

                    let calcWarehouseUOM = findWarehoseItem.UoMs.find((d) => d.IDUoM == 0);
                    if (!calcWarehouseUOM) {
                      calcWarehouseUOM = {
                        IDUoM: 0,
                        BaseQuantity: 0,
                        InventoryQuantity: 0,
                      };
                      findWarehoseItem.UoMs.push(calcWarehouseUOM);
                    }

                    if (l.Item.UoM.Id == l.Item.BaseUoM.Id || l.Item.UoM.Id == l.Item.InventoryUoM.Id) {
                      if (l.Item.UoM.Id == l.Item.BaseUoM.Id) {
                        calcWarehouseUOM.BaseQuantity += l.Quantity;
                      } else {
                        calcWarehouseUOM.InventoryQuantity += l.Quantity;
                      }

                      if (
                        calcWarehouseUOM.BaseQuantity >= findWarehoseItem.InventoryUoMBaseQuantity &&
                        findWarehoseItem.InventoryUoMBaseQuantity > 0
                      ) {
                        calcWarehouseUOM.InventoryQuantity +=
                          (calcWarehouseUOM.BaseQuantity -
                            (calcWarehouseUOM.BaseQuantity % findWarehoseItem.InventoryUoMBaseQuantity)) /
                          findWarehoseItem.InventoryUoMBaseQuantity;
                        calcWarehouseUOM.BaseQuantity =
                          calcWarehouseUOM.BaseQuantity % findWarehoseItem.InventoryUoMBaseQuantity;
                      }

                      let qdThung = parseInt(
                        (
                          (calcWarehouseUOM.BaseQuantity * l.Item.InventoryUoM.AlternativeQuantity) /
                          l.Item.InventoryUoM.BaseQuantity
                        ).toString(),
                      );
                      if (qdThung > 0) {
                        calcWarehouseUOM.InventoryQuantity += qdThung;
                        calcWarehouseUOM.BaseQuantity =
                          calcWarehouseUOM.BaseQuantity -
                          (qdThung * l.Item.InventoryUoM.BaseQuantity) / l.Item.InventoryUoM.AlternativeQuantity;
                      }
                    } else {
                      let uom = findWarehoseItem.UoMs.find((d) => d.IDUoM == l.Item.UoM.Id);
                      if (!uom) {
                        uom = {
                          IDUoM: l.Item.UoM.Id,
                          UoMName: l.Item.UoM.Name,
                          Quantity: 0,
                        };

                        findWarehoseItem.UoMs.push(uom);
                      }
                      uom.Quantity += l.Quantity;

                      let tongLeQty = (uom.Quantity * l.Item.UoM.BaseQuantity) / l.Item.UoM.AlternativeQuantity;
                      let qdThung = parseInt(
                        (
                          (tongLeQty * l.Item.InventoryUoM.AlternativeQuantity) /
                          l.Item.InventoryUoM.BaseQuantity
                        ).toString(),
                      );

                      if (qdThung > 0) {
                        calcWarehouseUOM.InventoryQuantity += qdThung;
                        let leConLai =
                          tongLeQty -
                          (qdThung * l.Item.InventoryUoM.BaseQuantity) / l.Item.InventoryUoM.AlternativeQuantity;

                        let uomLe = (leConLai * l.Item.UoM.AlternativeQuantity) / l.Item.UoM.BaseQuantity;
                        uom.Quantity = uomLe;
                      }

                      let qdLe = parseInt(
                        ((uom.Quantity * l.Item.UoM.BaseQuantity) / l.Item.UoM.AlternativeQuantity).toString(),
                      );
                      if (qdLe > 0 && l.Item.UoM.BaseQuantity < l.Item.UoM.AlternativeQuantity) {
                        calcWarehouseUOM.BaseQuantity += qdLe;
                        uom.Quantity = uom.Quantity - (qdLe * l.Item.UoM.AlternativeQuantity) / l.Item.UoM.BaseQuantity;
                      }

                      if (uom.Quantity == 0) {
                        const index = findWarehoseItem.UoMs.indexOf(uom);
                        if (index > -1) {
                          findWarehoseItem.UoMs.splice(index, 1);
                        }
                      }

                      qdThung = parseInt(
                        (
                          (calcWarehouseUOM.BaseQuantity * l.Item.InventoryUoM.AlternativeQuantity) /
                          l.Item.InventoryUoM.BaseQuantity
                        ).toString(),
                      );
                      if (qdThung > 0) {
                        calcWarehouseUOM.InventoryQuantity += qdThung;
                        calcWarehouseUOM.BaseQuantity =
                          calcWarehouseUOM.BaseQuantity -
                          (qdThung * l.Item.InventoryUoM.BaseQuantity) / l.Item.InventoryUoM.AlternativeQuantity;
                      }
                    }

                    if (calcWarehouseUOM.BaseQuantity == 0 && calcWarehouseUOM.InventoryQuantity == 0) {
                      const index = findWarehoseItem.UoMs.indexOf(calcWarehouseUOM);
                      if (index > -1) {
                        findWarehoseItem.UoMs.splice(index, 1);
                      }
                    }
                  });
                }
              }

              s.Items = itemList.sort(
                (a, b) => parseFloat(b.ItemSort) - parseFloat(a.ItemSort) || a.ItemCode.localeCompare(b.ItemCode),
              );
              warehouse.itemList = warehouse.itemList.sort(
                (a, b) => parseFloat(b.ItemSort) - parseFloat(a.ItemSort) || a.ItemCode.localeCompare(b.ItemCode),
              );
            }

            this.currentGroup = null;
            for (let w = 0; w < this.warehouses.length; w++) {
              const warehouse = this.warehouses[w];
              this.currentGroup = '';
              for (let i = 0; i < warehouse.itemList.length; i++) {
                const it = warehouse.itemList[i];
                it.isShowGroup = !this.checkCurrentGroup(it.ItemGroupName);
              }
            }

            console.log(this.warehouses);

            this.submitAttempt = false;
            if (loading) loading.dismiss();
          })
          .catch((err) => {
            if (err.message != null) {
              this.env.showMessage(err.message, 'danger');
            } else {
              this.env.showMessage('Cannote create list', 'danger');
            }
            this.submitAttempt = false;
            if (loading) loading.dismiss();
          });
      });
  }
  createOutbound(){
  
    let ids = this.selectedItems.map((m) => m.Id);

    if(!(ids.length >0)){
      return;
    }
    let obj = {
      IDs : ids 
    }

    this.env.showLoading('Please wait for a few moments', this.outboundProvider.commonService.connect('POST', 'WMS/OutboundOrder/CreateOutboundFromShipments/', obj).toPromise())
    .then((result: any) => {
      if(result){
        this.env.showMessage('saved!','success');
        this.refresh();
      }
      else{
        this.env.showMessage('cannot save!','danger');
      }
    }).catch((err) =>{
      this.env.showMessage(err.message, 'danger');

    })
  }
  exportPicking() {
    if (this.submitAttempt) {
      this.env.showMessage('Please wait for a few moments');
      return;
    }

    let selected =this.selectedItems.map((m) => m.Id);
    if (!selected.length) {
      this.env.showMessage('Please wait for a few moments', 'warning');
      return;
    }

    let docQuery: any = {
      Id: JSON.stringify(selected),
    };

    let apiPath = {
      getExport: {
        method: 'GET',
        url: function () {
          return ApiSetting.apiDomain('SHIP/Shipment/ExportPickingListByShipments/');
        },
      },
    };

    this.loadingController
      .create({
        cssClass: 'my-custom-class',
        message: 'Please wait for a few moments',
      })
      .then((loading) => {
        loading.present();
        this.submitAttempt = true;
        this.pageProvider.commonService
          .export(apiPath, docQuery)
          .then((response: any) => {
            this.submitAttempt = false;
            if (loading) loading.dismiss();
            this.downloadURLContent(response);
          })
          .catch((err) => {
            console.log(err);
            this.submitAttempt = false;
            if (loading) loading.dismiss();
          });
      });
  }

  toggleDateFilter() {
    this.query.IDStatus = this.query.IDStatus == '[301]' ? '' : '[301]';
    if (this.query.IDStatus == '[301]') {
      this.query.DeliveryDate = '';
    } else {
      let today = new Date();
      this.query.DeliveryDate = lib.dateFormat(today.setDate(today.getDate() + 1), 'yyyy-mm-dd');
    }

    this.refresh();
  }

  currentGroup = '';
  checkCurrentGroup(group) {
    if (this.currentGroup != group) {
      this.currentGroup = group;
      return false;
    }
    return true;
  }
}
