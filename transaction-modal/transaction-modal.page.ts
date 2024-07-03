import { Component, ChangeDetectorRef, Type } from '@angular/core';
import { NavController, ModalController, NavParams, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';

import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { HRM_StaffProvider, PM_TaskLinkProvider, PM_TaskProvider, WMS_TransactionProvider } from 'src/app/services/static/services.service';
import { Subject, concat, of, distinctUntilChanged, tap, switchMap, catchError, filter } from 'rxjs';
import { lib } from 'src/app/services/static/global-functions';
import { PM_Space, PM_Task } from 'src/app/models/model-list-interface';

@Component({
  selector: 'app-transaction-modal',
  templateUrl: './transaction-modal.page.html',
  styleUrls: ['./transaction-modal.page.scss'],
})
export class TransactionModalPage extends PageBase {
  sourceLine: number;
  transactionType : string;
  module : string;
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
    this.query.SourceLine = this.sourceLine;
    this.sortToggle('Id_desc', true);
    super.preLoadData(event);
  }


  revertTransaction(fg) {

    this.pageProvider.commonService
      .connect('POST', 'WMS/Transaction/RevertTransaction', {Id : fg.Id, Type: this.transactionType, Module: this.module})
      .toPromise()
      .then(() => {
        this.update = true;
        super.refresh();
        this.env.showTranslateMessage('Saving completed!', 'success');
        this.submitAttempt = false;
      })
      .catch((err) => {
        this.submitAttempt = false;
      });
  }

  async closeModal() {
     await this.modalController.dismiss(this.update);
  }
}
