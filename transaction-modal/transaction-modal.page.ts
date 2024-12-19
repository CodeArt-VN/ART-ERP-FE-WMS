import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, ModalController, NavParams, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';

import { FormBuilder, FormControl } from '@angular/forms';
import { WMS_TransactionProvider } from 'src/app/services/static/services.service';
@Component({
    selector: 'app-transaction-modal',
    templateUrl: './transaction-modal.page.html',
    styleUrls: ['./transaction-modal.page.scss'],
    standalone: false
})
export class TransactionModalPage extends PageBase {
  sourceKey: number;
  sourceLine: number;
  //statusLine: string;// TODO: truyen outbound, status lay tu backend
  transactionType : string;
  update = false;

  constructor(
    public pageProvider: WMS_TransactionProvider,
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
    this.pageConfig.isDetailPage = false;
    this.formGroup = formBuilder.group({
      IDBranch: [this.env.selectedBranch],
      Id: new FormControl({ value: '', disabled: true }),
      Code: [''],
      Name: [''],
      Type: [''],
      Status: [''],
      FromLocation: [''],
      ToLocation: [''],
      FromLPN: [''],
      ToLPN: [''],
      Quantity: [''],
      IDTransaction: [''],
      SourceType: [''],
      SourceKey: [''],
      SourceKeyStatus: [''],
      IsDisabled: new FormControl({ value: '', disabled: true }),
      IsDeleted: new FormControl({ value: '', disabled: true }),
      CreatedBy: new FormControl({ value: '', disabled: true }),
      CreatedDate: new FormControl({ value: '', disabled: true }),
      ModifiedBy: new FormControl({ value: '', disabled: true }),
      ModifiedDate: new FormControl({ value: '', disabled: true }),
    });
  }

  preLoadData(event?: any): void {
    if(this.sourceKey) {
      this.query.SourceKey = this.sourceKey;
    }
    else {
      this.query.SourceLine = this.sourceLine;
    }
    this.sortToggle('Id_desc', true);
    super.preLoadData(event);
  }


  revertTransaction(fg) {

    this.pageProvider.commonService
      .connect('POST', 'WMS/Transaction/RevertTransaction', {Id : fg.Id})
      .toPromise()
      .then(() => {
        this.update = true;
        super.refresh();
        this.env.showMessage('Saving completed!', 'success');
        this.submitAttempt = false;
      })
      .catch((err) => {
        this.env.showMessage(err.error.Message, 'danger');
        this.submitAttempt = false;
      });
  }

  async closeModal() {
     await this.modalController.dismiss(this.update);
  }
}
