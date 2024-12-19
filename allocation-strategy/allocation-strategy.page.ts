import { Component } from '@angular/core';
import { NavController, ModalController, AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { EnvService } from 'src/app/services/core/env.service';
import { PageBase } from 'src/app/page-base';
import { BRA_BranchProvider, CRM_ContactProvider, SYS_ConfigProvider, WMS_AllocationStrategyProvider } from 'src/app/services/static/services.service';
import { Location } from '@angular/common';
import { SortConfig } from 'src/app/models/options-interface';
import { FormBuilder, FormControl, Validators } from '@angular/forms';

@Component({
    selector: 'app-allocation-strategy',
    templateUrl: 'allocation-strategy.page.html',
    styleUrls: ['allocation-strategy.page.scss'],
    standalone: false
})
export class AllocationStrategyPage extends PageBase {
    
    statusList = [];
    constructor(
        public pageProvider: WMS_AllocationStrategyProvider,
        public branchProvider: BRA_BranchProvider,
        public contactProvider: CRM_ContactProvider,
        public modalController: ModalController,
        public formBuilder: FormBuilder,
        public sysConfigProvider: SYS_ConfigProvider,
        public popoverCtrl: PopoverController,
        public alertCtrl: AlertController,
        public loadingController: LoadingController,
        public env: EnvService,
        public navCtrl: NavController,
        public location: Location,
    ) {
        super();
        }
    
}
