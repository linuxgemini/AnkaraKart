
import AnkaraKart from "./index"

import { akUsageData, akCardData } from "./index"

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
class utils {
    private package: AnkaraKart
    constructor(main: AnkaraKart) {
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
        if ((formData && typeof (formData) !== "object")) throw new Error("form data is not an object");


        var appVersion = this.package.options.appVersion,
            appLanguage = "tr",
            appGUID = this.package.options.appGUID,
            phoneModel = this.package.options.phoneModel,
            phoneOperatingSystemVersion = this.package.options.phoneOperatingSystemVersion;

        var target = (this.isIPV4(ipAddress) ? `http://${ipAddress}/mbl/android` : `${ipAddress}/mbl/android`);


        var main: RequestConfig = {
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
    translateToEnglish(type: string, object: akUsageData[] | akCardData) {
        if (typeof (object) !== "object") throw new Error("not a valid object");
        var returningUsage = [],
            returning = {};
        switch (type.toLowerCase()) {
        case "cardinfo":
            returning.cardNumber = object.kart,
            returning.lastUpdated = this.convertTime("cardInfo", object.tarih),
            returning.credit = object.bakiye,
            returning.result = object.result,
            returning.message = this.vocabTranslate(object.message);
            return returning;
        case "cardusage":
            for (const usageData of object) {
                var ret = {};
                ret.cardNumber = usageData.kart_no,
                ret.date = this.convertTime("cardUsage", usageData.tarih),
                ret.operation = this.vocabTranslate(usageData.islem),
                ret.carType = this.vocabTranslate(usageData.arac);
                if (ret.carType === "Bus" || usageData.arac_no.length > 0) {
                    ret.carNumber = usageData.arac_no,
                    ret.carLine = usageData.hat;
                }
                ret.creditSpent = usageData.dusen,
                ret.creditRemaining = usageData.kalan;
                returningUsage.push(ret);
            }
            return returningUsage;
        default:
            return object;
        }
    }

    /**
     * Converts the local time string to a parsable timestamp.
     * @param {string} type cardInfo or cardUsage((object))
     * @param {string} timeStr The time string.
     */
    convertTime(type: string, timeStr: string) {
        switch (type.toLowerCase()) {
            case "cardinfo":
                var infoStr = timeStr.split(" "),
                    infoDate = infoStr[0].split(".").reverse().join("-"),
                    infoFinal = `${infoDate} ${infoStr[1]}`;
                return moment.tz(infoFinal, "Europe/Istanbul").format();
            case "cardusage":
                var usageStr = timeStr.split(" "),
                    usageDate = usageStr[0].split("/").reverse().join("-"),
                    usageFinal = `${usageDate} ${usageStr[1]}`;
                return moment.tz(usageFinal, "Europe/Istanbul").format();
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

export default utils