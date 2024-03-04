import { Component, ChangeDetectorRef } from '@angular/core';
import { NavController, LoadingController, AlertController } from '@ionic/angular';
import { PageBase } from 'src/app/page-base';
import { ActivatedRoute } from '@angular/router';
import { EnvService } from 'src/app/services/core/env.service';
import { SYS_TypeProvider, WMS_CartonGroupProvider, WMS_CartonProvider } from 'src/app/services/static/services.service';
import { FormBuilder, Validators, FormControl } from '@angular/forms';
import { CommonService } from 'src/app/services/core/common.service';

@Component({
    selector: 'app-carton-detail',
    templateUrl: './carton-detail.page.html',
    styleUrls: ['./carton-detail.page.scss'],
})
export class CartonDetailPage extends PageBase {
    cartonGroupList = [];
    cartonTypeList = [];
    containerTypeList = [];

    constructor(
        public pageProvider: WMS_CartonProvider,
        public cartonGroupProvider: WMS_CartonGroupProvider,
        public typeProvider: SYS_TypeProvider,
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
            IDBranch: [this.env.selectedBranch],
            IDCartonGroup: ['', Validators.required],
            Id: new FormControl({ value: '', disabled: true }),
            Code: [''],
            Name: ['', Validators.required],
            Remark: [''],
            Sort: [''],
            
            CartonType: [''],
            ContainerType: [''],

            DisplayForPicking: [''],
            DisplayForPacking: [''],
            DisplayForLoading: [''],

            Length: [''],
            Width: [''],
            Height: [''],

            Cube: [''],
            MaxCount: ['', Validators.required],
            MaxWeight: [''],
            TareWeight: [''],

            UseSequence: [''],
            DefaultPalletCartonType: ['Pallet'],
            DefaultNonPalletCartonType: ['Case'],

            
        });
    }

    preLoadData() {
        this.cartonGroupProvider.read().then(resp => {
            this.cartonGroupList = resp['data'];
        })
        this.typeProvider.read({ Code: 'CartonGroupType', AllChildren: true }).then(resp => {
            let i = resp['data'].find(d => d.Code == 'CartonType');
            if (i)
                this.cartonTypeList = resp['data'].filter(d => d.IDParent == i.Id);

            let j = resp['data'].find(d => d.Code == 'ContainerType');
            if (j)
                this.containerTypeList = resp['data'].filter(d => d.IDParent == j.Id);
        })

        super.preLoadData();
    }

    segmentView = 's1';
    segmentChanged(ev: any) {
        this.segmentView = ev.detail.value;
    }

    async saveChange() {
        super.saveChange2();
    }
}
