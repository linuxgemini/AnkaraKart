import Utils from "./utils"
import request from "request-promise-native"
import fs from "fs"

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

interface initData {
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

interface secondData {
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

export interface akUsageData {
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

interface akUsageDataRaw {
    data: [
        {
            table: akUsageData[];
            status: "TRUE" | "FALSE";
            message: string;
        }
    ]
}

export interface akCardData {
    kart: string;
    tarih: string; // 01.02.2020 17:55:00
    bakiye: string;
    result: string;
    message: string;
}

interface akCardDataRaw {
    data: [
        {
            table: akCardData[];
            status: "TRUE" | "FALSE";
            message: string;
        }
    ]
}

class AnkaraKart {
    private utils: Utils;
    public options: PackageOptions;
    constructor() {
        this.options = {
            maximumTimeFrame: 60000,
            primaryServer: "88.255.141.70",
            askedToPrimaryAt: 0
        };
        this.utils = new Utils(this);
        this.generateAppMetadata();
    }
    private generateAppMetadata() {
        const lastVer = "3.1.0";
        const phones = ["Nexus 5X", "Nexus 6P", "Galaxy C9 Pro", "GM 5 Plus d", "H2849", ""];
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
                var initalizer: Buffer = await request((this.utils.generateConfig(this.options.primaryServer, "connect") as request.OptionsWithUrl)); // tslint:disable-line
                var initJSON: initData = this.utils.cleanParse(initalizer);

                if (initJSON.data[0].status !== "TRUE") throw new Error("Status on API returning false (initalizer)");
                if (initJSON.data[0].servis !== "TRUE") throw new Error("Service on API returning false");
                if (initJSON.data[0].version !== this.options.appVersion) throw new Error(`API has returned version ${initJSON.data[0].version} but we have ${this.options.appVersion}\nReport to developer @linuxgemini ASAP.`);

                this.options.secondaryServer = (!initJSON.data[0].server ? this.options.primaryServer : initJSON.data[0].server);
                this.options.askedToPrimaryAt = Date.now();

                var base: Buffer = await request((this.utils.generateConfig(this.options.secondaryServer, "start") as request.OptionsWithUrl));
                var baseJSON: secondData = this.utils.cleanParse(base);

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
    getCardInfo(cardNumber: string, canReturnRaw?: boolean) {
        return new Promise(async (resolve, reject) => {
            try {
                if (typeof (cardNumber) !== "string") throw new Error("Card number must be a string.");
                if (parseInt(cardNumber).toString().length !== 16) throw new Error("Card number must be 16 digits long.");

                await this.autoAuthorize();

                var base = await request((this.utils.generateConfig(this.options.secondaryServer, "AnkaraKartBakiye", {
                    "KART": cardNumber
                }) as request.OptionsWithUrl));
                var baseJSON: akCardDataRaw = this.utils.cleanParse(base);

                if (baseJSON.data[0].status !== "TRUE") throw new Error("Status on API returning false (getCardInfo, baseJSON)");
                if (baseJSON.data[0].table[0].result === "3") throw new Error("Card is invalid.");

                if (canReturnRaw) {
                    resolve(baseJSON.data[0].table[0]);
                    return;
                } else {
                    var englishObj = await this.utils.translateToEnglish("cardInfo", baseJSON.data[0].table[0]);
                    resolve(englishObj);
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
    getCardUsage(cardNumber: string, canReturnRaw?: boolean) {
        return new Promise(async(resolve, reject) => {
            try {
                if (typeof (cardNumber) !== "string") throw new Error("Card number must be a string.");
                if (parseInt(cardNumber).toString().length !== 16) throw new Error("Card number must be 16 digits long.");

                await this.autoAuthorize();

                var base = await request((this.utils.generateConfig(this.options.secondaryServer, "AnkaraKartKullanim", {
                    "KART": cardNumber
                }) as request.OptionsWithUrl));
                var baseJSON: akUsageDataRaw = this.utils.cleanParse(base);

                if (baseJSON.data[0].status !== "TRUE") throw new Error("Status on API returning false (getCardUsage, baseJSON)");

                if (baseJSON.data[0].table.length === 0) {
                    resolve([]);
                    return;
                }

                if (canReturnRaw) {
                    resolve(baseJSON.data[0].table);
                    return;
                } else {
                    var englishObj = await this.utils.translateToEnglish("cardUsage", baseJSON.data[0].table);
                    resolve(englishObj);
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