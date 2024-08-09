import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { WMS_ItemGroupProvider, WMS_ItemUoMProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import QRCode from 'qrcode';
import { ActivatedRoute } from '@angular/router';
import { concat, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, map, mergeMap, switchMap, tap } from 'rxjs/operators';
import { lib } from 'src/app/services/static/global-functions';

@Component({
  selector: 'app-item-uom-label',
  templateUrl: 'item-uom-label.page.html',
  styleUrls: ['item-uom-label.page.scss'],
})
export class ItemUomLabelPage extends PageBase {
  lableConfig = {
    PageWidth: 96,
    QRCodeWidth: 206,
    CodeFontSize: 15,
    NameFontSize: 9,
    NameLineClamp: 2,
  };
  printMode = 'Ruy96';
  constructor(
    public pageProvider: WMS_ItemUoMProvider,
    public itemGroupProvider: WMS_ItemGroupProvider,
    public modalController: ModalController,
    public popoverCtrl: PopoverController,
    public alertCtrl: AlertController,
    public loadingController: LoadingController,
    public env: EnvService,
    public navCtrl: NavController,
    public location: Location,
    public route: ActivatedRoute,
  ) {
    super();
    this.pageConfig.isShowFeature = true;
    //this.id = this.route.snapshot.paramMap.get('id');
    this.item = { ItemUoM: [] };
  }

  preLoadData(event?: any): void {
    this.loadedData(event);
  }

  loadedData(event?: any, ignoredFromGroup?: boolean): void {
    super.loadedData(event, ignoredFromGroup);
    this.IDItemUoMDataSource.initSearch();
    this.ItemGroupDataSource.initSearch();
  }

  createPages() {
    if (this.submitAttempt) {
      this.env.showTranslateMessage('Xin vui lòng chờ xử lý.');
      return;
    }
    if (this.item.ItemUoM.length == 0) {
      this.env.showTranslateMessage('Xin vui lòng chọn sản phẩm cần in.');
      return;
    }

    this.pageConfig.showSpinner = true;
    this.submitAttempt = true;
    this.env
      .showLoading2('Xin vui lòng chờ tạo nhãn in', () => this.loadLabel(this.item.ItemUoM))
      .then((data) => {
        this.items = data;
        this.pageConfig.showSpinner = false;
        this.submitAttempt = false;
        this.env.showTranslateMessage('Đã tạo {{value}} mã.',null,this.items.length);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  IDItemUoMDataSource = {
    searchProvider: this.pageProvider,
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
                Take: 200,
                Skip: 0,
                Term: term,
              })
              .pipe(
                catchError(() => of([])), // empty list on error
                tap(() => (this.loading = false)),
              ),
          ),
        ),
      );
    },
  };

  ItemGroupDataSource = {
    searchProvider: this.itemGroupProvider,
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
                Take: 200,
                Skip: 0,
                Keyword: term,
              })
              .pipe(
                catchError(() => of([])), // empty list on error
                tap(() => (this.loading = false)),
                mergeMap((e) => lib.buildFlatTree(e, e)),
              ),
          ),
        ),
      );
    },
  };

  loadLabel(ItemUoMs) {
    return new Promise((resolve) => {
      let result = [];
      ItemUoMs.forEach((i) => {
        let label: any = {};
        label.Value = '' + (i.Barcode ? i.Barcode : i.Id);
        label.data = i;
        QRCode.toDataURL(
          label.Value,
          {
            errorCorrectionLevel: 'H',
            version: 2,
            width: 500,
            scale: 20,
            type: 'image/webp',
          },
          function (err, url) {
            label.QRC = url;
          },
        );

        result.push(label);
      });

      resolve(result);
    });
  }

  itemUoMChange(e) {}

  changeGroup(e) {
    console.log(e);

    this.pageProvider
      .search({
        SortBy: ['Id_desc'],
        Take: 20000,
        Skip: 0,
        IDItemGroup: e.Id,
      })
      .toPromise()
      .then((data: any) => {
        this.item.ItemUoM = [...data];
      })
      .catch((err) => {
        this.item.ItemUoM = [...[]];
        console.log(err);
      });
  }
}
