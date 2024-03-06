import { Component, ViewChild } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { WMS_ItemGroupProvider, WMS_ItemProvider } from 'src/app/services/static/services.service';
import { ItemDetailPage } from '../item-detail/item-detail.page';
import { ApiSetting } from 'src/app/services/static/api-setting';
import { lib } from 'src/app/services/static/global-functions';

@Component({
  selector: 'app-item',
  templateUrl: 'item.page.html',
  styleUrls: ['item.page.scss'],
})
export class ItemPage extends PageBase {
  itemGroupList = [];

  constructor(
    public pageProvider: WMS_ItemProvider,
    public itemGroupProvider: WMS_ItemGroupProvider,
    public modalController: ModalController,
    public popoverCtrl: PopoverController,
    public alertCtrl: AlertController,
    public loadingController: LoadingController,
    public env: EnvService,
    public navCtrl: NavController,
  ) {
    super();
    this.pageConfig.isShowSearch = true;

    Object.assign(pageProvider, {
      importItemInVendor(fileToUpload: File) {
        const formData: FormData = new FormData();
        formData.append('fileKey', fileToUpload, fileToUpload.name);
        return new Promise((resolve, reject) => {
          this.commonService
            .connect('UPLOAD', ApiSetting.apiDomain('WMS/Item/ImportItemInVendor/'), formData)
            .toPromise()
            .then((data) => {
              resolve(data);
            })
            .catch((err) => {
              reject(err);
            });
        });
      },
    });
  }

  preLoadData(event) {
    this.sort.Id = 'Id';
    this.sortToggle('Id', true);
    this.itemGroupProvider.read({ Take: 5000, IgnoredBranch: true }).then((resp) => {
      lib.buildFlatTree(resp['data'], this.itemGroupList).then((tree: any) => {
        let ls = tree;
        ls.forEach((g) => {
          g.childrenIds = [];
          g.childrenIds = lib.findChildren(ls, g.Id, [g.Id]);
          g.Query = JSON.stringify(g.childrenIds);
        });

        ls.forEach((i) => {
          let prefix = '';
          for (let j = 1; j < i.level; j++) {
            prefix += '- ';
          }
          i.NamePadding = prefix + i.Name;
          this.itemGroupList.push(i);
        });
      });
    });
    super.preLoadData(event);
  }

  loadedData(event?: any, ignoredFromGroup?: boolean): void {
    this.items.forEach((i) => {
      i.ItemGroup = lib.getAttrib(i.IDItemGroup, this.itemGroupList);
    });
    super.loadedData(event, ignoredFromGroup);
  }

  showItem(i) {
    if (this.pageConfig.updateSizeVolumeOnly && i.Id) {
      this.navCtrl.navigateForward('/item/uom/' + i.Id);
    } else {
      this.navCtrl.navigateForward('/item/' + i.Id);
    }
  }

  async showItem_back(i) {
    const modal = await this.modalController.create({
      component: ItemDetailPage,
      componentProps: {
        items: [],
        item: i,
        id: i.Id,
      },
      cssClass: 'my-custom-class',
    });
    return await modal.present();
  }

  add() {
    let newItem = {
      Id: 0,
    };
    this.showItem(newItem);
  }

  @ViewChild('importfile2') importfile: any;
  importItemInVendor() {
    this.importfile.nativeElement.value = '';
    this.importfile.nativeElement.click();
  }

  async uploadItemInVendor(event) {
    if (event.target.files.length == 0 || !this.pageConfig.canImportItemInVendor) return;

    const loading = await this.loadingController.create({
      cssClass: 'my-custom-class',
      message: 'Vui lòng chờ import dữ liệu',
    });
    await loading.present().then(() => {
      this.pageProvider['importItemInVendor'](event.target.files[0])
        .then((resp: any) => {
          this.refresh();
          if (loading) loading.dismiss();

          if (resp.ErrorList && resp.ErrorList.length) {
            let message = '';
            for (let i = 0; i < resp.ErrorList.length && i <= 5; i++)
              if (i == 5) message += '<br> Còn nữa...';
              else {
                const e = resp.ErrorList[i];
                message += '<br> ' + e.Id + '. Tại dòng ' + e.Line + ': ' + e.Message;
              }

            this.alertCtrl
              .create({
                header: 'Có lỗi import dữ liệu',
                subHeader: 'Bạn có muốn xem lại các mục bị lỗi?',
                message: 'Có ' + resp.ErrorList.length + ' lỗi khi import:' + message,
                cssClass: 'alert-text-left',
                buttons: [
                  {
                    text: 'Không',
                    role: 'cancel',
                    handler: () => {},
                  },
                  {
                    text: 'Có',
                    cssClass: 'success-btn',
                    handler: () => {
                      this.downloadURLContent(ApiSetting.mainService.base + resp.FileUrl);
                    },
                  },
                ],
              })
              .then((alert) => {
                alert.present();
              });
          } else {
            this.env.showTranslateMessage('Import completed!', 'success');
            this.env.publishEvent({
              Code: this.pageConfig.pageName,
            });
          }
        })
        .catch((err) => {
          if (err.statusText == 'Conflict') {
            this.downloadURLContent(ApiSetting.mainService.base + err._body);
          }
          if (loading) loading.dismiss();
        });
    });
  }

  duplicateItem() {
    if (this.submitAttempt) {
      this.env.showMessage('Xin vui lòng chờ xử lý hoàn tất.');
      return;
    }

    this.env
      .showPrompt('Bạn muốn tạo mã Z cho các item đang chọn?', null, 'Copy sản phẩm')
      .then((_) => {
        this.env
          .showLoading(
            'Xin vui lòng chờ copy dữ liệu',
            this.pageProvider.commonService
              .connect('POST', 'WMS/Item/DuplicateItem/', {
                Ids: this.selectedItems.map((e) => e.Id),
              })
              .toPromise(),
          )
          .then((_) => {
            this.env.showTranslateMessage('Saving completed!', 'success');
            this.submitAttempt = false;
            this.refresh();
          })
          .catch((err) => {
            this.submitAttempt = false;
            console.log(err);
          });
      })
      .catch((_) => {});
  }
}
