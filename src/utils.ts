
import * as AnkaraKart from "./AnkaraKart";

import { URL, URLSearchParams } from "url";
import iconv from "iconv-lite";
import moment from "moment-timezone";
import { v4 as guidGen } from "uuid";

interface RequestConfig {
    method: "POST";
    headers: {
        "User-Agent": string;
        "Connection": "keep-alive";
        "content-type": "application/x-www-form-urlencoded";
    };
    body?: URLSearchParams;
}

/**
 * Utilites for AnkaraKart Class.
 * @author İlteriş Eroğlu
 * @private
 */
class Utils {
    private package: AnkaraKart.AnkaraKart;

    constructor(main: AnkaraKart.AnkaraKart) {
        this.package = main;
    }

    generateURL(ipAddress: string, requestFunc: string): URL {
        let target = (this.isIPV4(ipAddress) ? `http://${ipAddress}/mbl/android` : `${ipAddress}/mbl/android`);
        
        const appVersion = this.package.options.appVersion;
        const appLanguage = "tr";
        const appGUID = this.package.options.appGUID;

        let params = {
            SID: Math.random().toString(),
            VER: appVersion,
            LAN: appLanguage,
            UID: appGUID,
            FNC: ""
        };

        switch (requestFunc.toLowerCase()) {
            case "connect":
                params.FNC = "Connect";
                target = `${target}/connect.asp`;
                break;
            case "start":
                params.FNC = "Start";
                target = `${target}/connect.asp`;
                break;
            default:
                params.FNC = requestFunc;
                target = `${target}/action.asp`;
                break;
        }

        let targetURL = new URL(target);

        targetURL.search = new URLSearchParams(params).toString();

        return targetURL;
    }

    /**
     * Generates config for request().
     * @param {string} ipAddress The target (IP) address.
     * @param {string} requestFunc The function to request.
     * @param {object} formData The form data of the function.
     */
    generateConfig(requestFunc: string, formData: {} = {}) {
        let appVersion = this.package.options.appVersion;
        let appGUID = this.package.options.appGUID;
        let phoneModel = this.package.options.phoneModel;
        let phoneOperatingSystemVersion = this.package.options.phoneOperatingSystemVersion;

        let main: RequestConfig = {
            method: "POST",
            headers: {
                "User-Agent": `EGO Genel Mudurlugu-EGO Cepte-${appVersion} ${phoneModel} ${phoneOperatingSystemVersion}`,
                "Connection": "keep-alive",
                "content-type": "application/x-www-form-urlencoded"
            }
        };

        switch (requestFunc.toLowerCase()) {
            case "connect":
                main.body = new URLSearchParams({
                    UID: appGUID,
                    UPS: "TRUE"
                });
                break;
            case "start":
                break;
            default:
                if (formData) {
                    main.body = new URLSearchParams(formData);
                }
                break;
        }

        return main;
    }

    /**
     * Parses the invalid JSON object.
     * @param {Buffer} body The incorrect JSON object.
     */
    cleanParse(body: Buffer) {
        return JSON.parse(iconv.decode(body, "windows-1254").replace(/'/g, "\""));
    }

    /**
     * Translates cardObject or cardUsageArray to English.
     * @param {string} type cardInfo or cardUsage
     * @param {Object} object cardObject or cardUsage((Array))
     */
    translateToEnglish(type: string, object: AnkaraKart.AKCardData | AnkaraKart.AKUsageData[] | Object): AnkaraKart.AKCardDataENG | AnkaraKart.AKUsageDataENG[] | Object {
        switch (type.toLowerCase()) {
            case "cardinfo":
                let returning: AnkaraKart.AKCardDataENG = {
                    cardNumber: (object as AnkaraKart.AKCardData).kart,
                    lastUpdated: this.convertTime("cardInfo", (object as AnkaraKart.AKCardData).tarih),
                    credit: (object as AnkaraKart.AKCardData).bakiye,
                    result: (object as AnkaraKart.AKCardData).result,
                    message: this.vocabTranslate((object as AnkaraKart.AKCardData).message)
                };
                return returning;
            case "cardusage":
                let returningUsage = [];
                for (const usageData of (object as AnkaraKart.AKUsageData[])) {
                    returningUsage.push({
                        cardNumber: usageData.kart_no,
                        cardBackNumber: usageData.no_kart,
                        date: this.convertTime("cardUsage", usageData.tarih),
                        operation: this.vocabTranslate(usageData.islem),
                        carType: this.vocabTranslate(usageData.arac),
                        carNumber: usageData.arac_no,
                        carLine: usageData.hat,
                        creditSpent: usageData.dusen,
                        creditRemaining: usageData.kalan,
                    });
                }
                return (returningUsage as AnkaraKart.AKUsageDataENG[]);
            default:
                return object;
        }
    }

    /**
     * Converts the local time string to a parsable timestamp.
     * @param {string} type cardInfo or cardUsage((object))
     * @param {string} timeStr The time string.
     */
    convertTime(type: string, timeStr: string): Date {
        switch (type.toLowerCase()) {
            case "cardinfo":
                return moment.tz(timeStr, "DD.MM.YYYY HH:mm:ss", "Europe/Istanbul").toDate();
            case "cardusage":
                return moment.tz(timeStr, "DD/MM/YYYY HH:mm", "Europe/Istanbul").toDate();
            default:
                return new Date();
        }
    }

    /**
     * Checks the incoming string and translates it.
     * @param {string} str The string to be translated.
     */
    vocabTranslate(str: string): string {
        switch (str.toLowerCase()) {
        case "ankaray":
            return "Ankaray";
        case "metro":
            return "Metro";
        case "otobüs":
            return "Bus";
        case "sorgulama başarılı":
            return "Query Successful";
        case "i̇lk bi̇ni̇ş":
            return "First Entry";
        case "i̇ki̇nci̇ ki̇şi̇":
            return "Second Person";
        case "aktarma":
            return "Transfer";
        case "geçersiz kart":
            return "Invalid Card";
        default:
            return str;
        }
    }

    /**
     * Checks if the string is a valid IPv4 address.
     * @param {string} str 
     */
    isIPV4(str: string): boolean {
        if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(str)) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * Picks a random number in the specified limits.
     * @param {number} min Minimum
     * @param {number} max Maximum
     * @returns {number}
     */
    randNumGen(min: number, max: number): number {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Picks random item from an Array.
     * @param {array} arr 
     * @returns {any}
     */
    pickRand(arr: any[]): any {
        if (!Array.isArray(arr)) return;
        return arr[Math.floor(Math.random() * arr.length)];
    }

    /**
     * Builds a custom GUID.
     * @returns {string}
     */
    guidBuilder(): string {
        return `{${guidGen().toUpperCase()}}-${this.randNumGen(111111111, 999999999)}`;
    }
}

export default Utils
