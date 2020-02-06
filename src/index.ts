import Utils from "./utils"
import request from "request-promise-native"

import appver from "./latestappver.json"
import fs from "fs"
import path from "path"

interface PackageOptions {
    maximumTimeFrame: number;
    primaryServer: string;
    secondaryServer?: string;
    askedToPrimaryAt: number;
    appGUID?: string;
    appVersion?: string;
    phoneModel?: string;
    phoneOperatingSystemVersion?: string;
}

interface Initdata {
    data: [
        {
            version: string;
            servis: "TRUE" | "FALSE";
            update: "TRUE" | "FALSE";
            server: string;
            geoserver: string;
            ankarakart: string;
            userid: string;
            username: string;
            ad: string;
            soyad: string;
            telefon: string;
            eposta: string;
            favorihat: string;
            favoridurak: string;
            favoripanel: string;
            status: "TRUE" | "FALSE";
            message: string;
        }
    ]
}

interface SecondData {
    data: [
        {
            reklam_count: string;
            reklam_status: "TRUE" | "FALSE";
            reklam: string;
            reklam_action: string;
            bilgilendirme_count: string;
            bilgilendirme_status: string;
            bilgilendirme: string;
            bilgilendirme_action: string;
            sorun_birim: string[];
            sorun_konu: string[];
            status: "TRUE" | "FALSE";
            message: string;
        }
    ]
}

export interface AKUsageData {
    kart_no: string;
    no_kart: string;
    tarih: string; // 01/02/2020 17:55
    arac: string;
    arac_no: string;
    hat: string;
    dusen: string;
    kalan: string;
    islem: string;
}

export interface AKUsageDataENG {
    cardNumber: AKUsageData["kart_no"];
    cardBackNumber: AKUsageData["no_kart"];
    date: Date | undefined;
    operation: AKUsageData["islem"];
    carType: AKUsageData["arac"];
    carNumber: AKUsageData["arac_no"];
    carLine: AKUsageData["hat"];
    creditSpent: AKUsageData["dusen"];
    creditRemaining: AKUsageData["kalan"];
}

interface AKUsageDataRaw {
    data: [
        {
            table: AKUsageData[];
            status: "TRUE" | "FALSE";
            message: string;
        }
    ]
}

export interface AKCardData {
    kart: string;
    tarih: string; // 01.02.2020 17:55:00
    bakiye: string;
    result: string;
    message: string;
}

export interface AKCardDataENG {
    cardNumber: AKCardData["kart"];
    lastUpdated: Date | undefined;
    credit: AKCardData["bakiye"];
    result: AKCardData["result"];
    message: AKCardData["message"];
}

interface AKCardDataRaw {
    data: [
        {
            table: AKCardData[];
            status: "TRUE" | "FALSE";
            message: string;
        }
    ]
}

class AnkaraKart {
    private utils: Utils;
    private packageLoc: string;
    public options: PackageOptions;
    constructor() {
        this.packageLoc = __dirname;
        this.options = {
            maximumTimeFrame: 60000,
            primaryServer: "88.255.141.70",
            askedToPrimaryAt: 0
        };
        this.utils = new Utils(this);
        this.generateAppMetadata();
    }
    private generateAppMetadata() {
        const lastVer = appver.appver;
        const phones = ["Nexus 5X", "Nexus 6P", "Galaxy C9 Pro", "GM 5 Plus d", "H2849", "CoreBootDevice", "AndroidX86", "Switch"];
        const osVersions = ["7.0.1", "8.0.0", "8.0.1", "7.1.2", "6.0.1", "6.0", "7.0", "7.1.1", "7.1.1", "7.1"];

        this.options.appGUID = this.utils.guidBuilder();
        this.options.appVersion = lastVer;
        this.options.phoneModel = this.utils.pickRand(phones);
        this.options.phoneOperatingSystemVersion = this.utils.pickRand(osVersions);
    }

    /**
     * Connect to the endpoint and authorize.
     * @returns {Promise<true>}
     */
    authorize() {
        return new Promise(async(resolve, reject) => {
            try {
                let initalizer: Buffer = await request((this.utils.generateConfig(this.options.primaryServer, "connect") as request.OptionsWithUrl)); // tslint:disable-line
                let initJSON: Initdata = this.utils.cleanParse(initalizer);

                if (initJSON.data[0].status !== "TRUE") throw new Error("Status on API returning false (initalizer)");
                if (initJSON.data[0].servis !== "TRUE") throw new Error("Service on API returning false");
                if (initJSON.data[0].version !== this.options.appVersion) {
                    this.options.appVersion = initJSON.data[0].version;
                    appver.appver = initJSON.data[0].version;
                    fs.writeFileSync(path.join(this.packageLoc, "latestappver.json"), JSON.stringify(appver));
                }

                this.options.secondaryServer = (!initJSON.data[0].server ? this.options.primaryServer : initJSON.data[0].server);
                this.options.askedToPrimaryAt = Date.now();

                let base: Buffer = await request((this.utils.generateConfig(this.options.secondaryServer, "start") as request.OptionsWithUrl));
                let baseJSON: SecondData = this.utils.cleanParse(base);

                if (baseJSON.data[0].status !== "TRUE") throw new Error("Status on API returning false (base)");

                resolve(true);
                return;
            } catch (exp) {
                reject(exp);
                return;
            }
        });
    }

    /**
     * Checks if the authorization interval has passed.
     * @returns {boolean}
     */
    private authorized() {
        return (Date.now() - this.options.askedToPrimaryAt < this.options.maximumTimeFrame);
    }

    /**
     * Automatically authorize if the authorization interval has passed.
     * @returns {Promise<true>}
     */
    private autoAuthorize() {
        return new Promise(async (resolve, reject) => {
            if (!this.authorized()) {
                try {
                    await this.authorize();
                    resolve(true);
                    return;
                } catch (exp) {
                    reject(exp);
                    return;
                }
            } else {
                resolve(true);
                return;
            }
        });
    }

    /**
     * Get card information.
     * @param {string} cardNumber The card number, 16 digits long.
     * @param {boolean} canReturnRaw Return cardObjectRaw instead of cardObject.
     * @returns {Promise<Object>}
     */
    getCardInfo(cardNumber: string, canReturnRaw?: boolean): Promise<AKCardDataENG | AKCardData> {
        return new Promise(async (resolve, reject) => {
            try {
                if (typeof (cardNumber) !== "string") throw new Error("Card number must be a string."); // tslint:disable-line: strict-type-predicates
                if (parseInt(cardNumber, 10).toString().length !== 16) throw new Error("Card number must be 16 digits long.");

                await this.autoAuthorize();

                let base = await request((this.utils.generateConfig(this.options.secondaryServer, "AnkaraKartBakiye", {
                    "KART": cardNumber
                }) as request.OptionsWithUrl));
                let baseJSON: AKCardDataRaw = this.utils.cleanParse(base);

                if (baseJSON.data[0].status !== "TRUE") throw new Error("Status on API returning false (getCardInfo, baseJSON)");
                if (baseJSON.data[0].table[0].result === "3") throw new Error("Card is invalid.");

                if (canReturnRaw) {
                    resolve(baseJSON.data[0].table[0]);
                    return;
                } else {
                    let englishObj = this.utils.translateToEnglish("cardInfo", baseJSON.data[0].table[0]);
                    resolve((englishObj as AKCardDataENG));
                    return;
                }
            } catch (exp) {
                reject(exp);
                return;
            }
        });
    }

    /**
     * Get card usage data.
     * @param {string} cardNumber The card number, 16 digits long.
     * @param {boolean} canReturnRaw Return cardUsageArrayRaw instead of cardUsageArray.
     * @returns {Promise<Array>}
     */
    getCardUsage(cardNumber: string, canReturnRaw?: boolean): Promise<AKUsageDataENG[] | AKUsageData[]> {
        return new Promise(async(resolve, reject) => {
            try {
                if (typeof (cardNumber) !== "string") throw new Error("Card number must be a string."); // tslint:disable-line: strict-type-predicates
                if (parseInt(cardNumber, 10).toString().length !== 16) throw new Error("Card number must be 16 digits long.");

                await this.autoAuthorize();

                let base = await request((this.utils.generateConfig(this.options.secondaryServer, "AnkaraKartKullanim", {
                    "KART": cardNumber
                }) as request.OptionsWithUrl));
                let baseJSON: AKUsageDataRaw = this.utils.cleanParse(base);

                if (baseJSON.data[0].status !== "TRUE") throw new Error("Status on API returning false (getCardUsage, baseJSON)");

                if (baseJSON.data[0].table.length === 0) {
                    resolve([]);
                    return;
                }

                if (canReturnRaw) {
                    resolve(baseJSON.data[0].table);
                    return;
                } else {
                    let englishObj = this.utils.translateToEnglish("cardUsage", baseJSON.data[0].table);
                    resolve((englishObj as AKUsageDataENG[]));
                    return;
                }
            } catch (exp) {
                reject(exp);
                return;
            }
        });
    }

}

export default AnkaraKart
export const Client = AnkaraKart;
