
import * as AnkaraKart from "./index"

import iconv from "iconv-lite"
import moment from "moment-timezone"
import guidGen from "uuid/v4"

interface RequestConfig {
    method: "POST";
    url?: string;
    headers: {
        "User-Agent": string;
        "Connection": "keep-alive";
        "content-type": "application/x-www-form-urlencoded";
    };
    qs: {
        SID: string;
        VER: string | undefined;
        LAN: string;
        UID: string | undefined;
        FNC?: string;
    };
    form?: {
        UID: string | null;
        UPS: "TRUE";
    } | object;
    encoding: null;
}

/**
 * Utilites for AnkaraKart Class.
 * @author İlteriş Eroğlu
 * @private
 */
class Utils {
    private package: AnkaraKart.default
    constructor(main: AnkaraKart.default) {
        this.package = main;
    }
    /**
     * Generates config for request().
     * @param {string} ipAddress The target (IP) address.
     * @param {string} requestFunc The function to request.
     * @param {object} formData The form data of the function.
     */
    generateConfig(ipAddress?: string, requestFunc?: string, formData?: object) {
        if (!ipAddress) throw new Error("ip address is missing");
        if (!requestFunc) throw new Error("request function is missing");

        let appVersion = this.package.options.appVersion;
        let appLanguage = "tr";
        let appGUID = this.package.options.appGUID;
        let phoneModel = this.package.options.phoneModel;
        let phoneOperatingSystemVersion = this.package.options.phoneOperatingSystemVersion;

        let target = (this.isIPV4(ipAddress) ? `http://${ipAddress}/mbl/android` : `${ipAddress}/mbl/android`);


        let main: RequestConfig = {
            method: "POST",
            headers: {
                "User-Agent": `EGO Genel Mudurlugu-EGO Cepte-${appVersion} ${phoneModel} ${phoneOperatingSystemVersion}`,
                "Connection": "keep-alive",
                "content-type": "application/x-www-form-urlencoded"
            },
            qs: {
                SID: Math.random().toString(),
                VER: appVersion,
                LAN: appLanguage,
                UID: appGUID
            },
            encoding: null
        };

        switch (requestFunc.toLowerCase()) {
            case "connect":
                main.qs.FNC = "Connect";
                main.url = `${target}/connect.asp`;
                main.form = {
                    UID: appGUID,
                    UPS: "TRUE"
                };
                break;
            case "start":
                main.qs.FNC = "Start";
                main.url = `${target}/connect.asp`;
                break;
            default:
                main.qs.FNC = requestFunc;
                main.url = `${target}/action.asp`;
                if (formData) {
                    main.form = formData;
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
